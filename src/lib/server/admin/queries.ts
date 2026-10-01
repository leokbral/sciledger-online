import ActivityEvent from '$lib/db/models/ActivityEvent';
import Hubs from '$lib/db/models/Hub';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import ReviewModel from '$lib/db/models/Review';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { buildSearchFilter, paginate, type Paginated, type PaginationInput } from './pagination';

/**
 * Field allowlists.
 *
 * These are allowlists rather than `-password -token...` denylists on purpose: a
 * field added to a schema later is then excluded by default instead of silently
 * leaking into the admin UI and its JSON APIs. Nothing here may carry a password,
 * a password hash, a verification or reset token, an ORCID access/refresh token, a
 * Stripe account identifier or any other credential.
 */
const USER_FIELDS = [
	'id',
	'_id',
	'firstName',
	'lastName',
	'username',
	'email',
	'orcid',
	'institution',
	'position',
	'emailVerified',
	'billingStatus',
	'profilePictureUrl',
	'createdAt',
	'updatedAt'
].join(' ');

const HUB_FIELDS = [
	'id',
	'_id',
	'title',
	'type',
	'status',
	'createdBy',
	'assistantManagers',
	'reviewers',
	'submittedPapers',
	'issn',
	'createdAt'
].join(' ');

const PAPER_FIELDS = [
	'id',
	'_id',
	'title',
	'status',
	// A hub decline lives in these two fields, not in `status`. `rejectionReason` is
	// deliberately left out: it is free text that belongs on the paper's own page, not
	// in an administrative table.
	'rejectedByHub',
	'rejectedAt',
	'doi',
	'hubId',
	'mainAuthor',
	'submittedBy',
	'createdAt',
	'updatedAt'
].join(' ');

/**
 * Invitations carry tokens in sibling collections; this projection stays on the
 * operational fields only and never selects an invitation secret.
 */
const INVITATION_FIELDS = [
	'id',
	'_id',
	'paperId',
	'reviewerId',
	'invitedBy',
	'hubId',
	'status',
	'invitedAt',
	'expiresAt',
	'respondedAt',
	'resendCount',
	'createdAt'
].join(' ');

type Lean = Record<string, any>;

function normalizeId(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (typeof value === 'object') {
		const candidate = value as Lean;
		if (candidate.id) return String(candidate.id);
		if (candidate._id) return String(candidate._id);
	}
	return String(value);
}

function uniqueIds(values: unknown[]): string[] {
	return [...new Set(values.map(normalizeId).filter(Boolean))];
}

export function userDisplayName(user: Lean | null | undefined) {
	if (!user) return '';
	const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
	return name || user.username || user.email || normalizeId(user);
}

/**
 * Resolves user ids to a small display shape in ONE query, so list views do not
 * issue a lookup per row.
 */
async function loadUserLabels(ids: string[]) {
	const wanted = uniqueIds(ids);
	if (wanted.length === 0) return new Map<string, Lean>();

	const rows = (await Users.find({ $or: [{ id: { $in: wanted } }, { _id: { $in: wanted } }] })
		.select('id _id firstName lastName username email')
		.lean()) as Lean[];

	const byId = new Map<string, Lean>();
	for (const row of rows) {
		const label = {
			id: normalizeId(row.id || row._id),
			name: userDisplayName(row),
			email: row.email ?? null,
			username: row.username ?? null
		};
		if (row.id) byId.set(String(row.id), label);
		if (row._id) byId.set(String(row._id), label);
	}

	return byId;
}

/** Resolves hub ids to titles in ONE query. */
async function loadHubLabels(ids: string[]) {
	const wanted = uniqueIds(ids);
	if (wanted.length === 0) return new Map<string, Lean>();

	const rows = (await Hubs.find({ $or: [{ id: { $in: wanted } }, { _id: { $in: wanted } }] })
		.select('id _id title type')
		.lean()) as Lean[];

	const byId = new Map<string, Lean>();
	for (const row of rows) {
		const label = { id: normalizeId(row.id || row._id), title: row.title, type: row.type };
		if (row.id) byId.set(String(row.id), label);
		if (row._id) byId.set(String(row._id), label);
	}

	return byId;
}

/** Resolves paper ids to titles in ONE query. */
async function loadPaperLabels(ids: string[]) {
	const wanted = uniqueIds(ids);
	if (wanted.length === 0) return new Map<string, Lean>();

	const rows = (await Papers.find({ $or: [{ id: { $in: wanted } }, { _id: { $in: wanted } }] })
		.select('id _id title status rejectedByHub hubId')
		.lean()) as Lean[];

	const byId = new Map<string, Lean>();
	for (const row of rows) {
		const label = {
			id: normalizeId(row.id || row._id),
			title: row.title,
			status: row.status,
			// Carried so screens that show a paper's status alongside something else
			// (the reviews list) label a hub-declined paper the same way.
			declined: row.rejectedByHub === true || row.status === 'rejected',
			hubId: row.hubId ? normalizeId(row.hubId) : null
		};
		if (row.id) byId.set(String(row.id), label);
		if (row._id) byId.set(String(row._id), label);
	}

	return byId;
}

function serialize<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export async function getDashboardMetrics() {
	await start_mongo();

	const [userCount, hubCount, paperCount, reviewAssignmentCount, submittedReviewCount] =
		await Promise.all([
			Users.countDocuments({}),
			Hubs.countDocuments({}),
			Papers.countDocuments({}),
			ReviewAssignment.countDocuments({}),
			ReviewModel.countDocuments({ status: { $in: ['submitted', 'completed'] } })
		]);

	const [publishedPaperCount, declinedPaperCount, pendingInvitationCount] = await Promise.all([
		Papers.countDocuments({ status: 'published' }),
		// Counted with the two-signal condition, so this matches the Declined filter on
		// /admin/papers rather than only the papers whose status is 'rejected'.
		Papers.countDocuments(declinedPaperCondition()),
		PaperReviewInvitation.countDocuments({ status: 'pending' })
	]);

	const [recentUsers, recentPapers, recentAdminActivity] = await Promise.all([
		Users.find({}).select(USER_FIELDS).sort({ createdAt: -1 }).limit(5).lean(),
		Papers.find({}).select(PAPER_FIELDS).sort({ createdAt: -1 }).limit(5).lean(),
		ActivityEvent.find({ type: { $regex: '^admin\\.' } })
			.sort({ createdAt: -1 })
			.limit(10)
			.lean()
	]);

	const actorLabels = await loadUserLabels(
		(recentAdminActivity as Lean[]).map((event) => event.actorId)
	);
	const authorLabels = await loadUserLabels(
		(recentPapers as Lean[]).flatMap((paper) => [paper.mainAuthor, paper.submittedBy])
	);

	return serialize({
		counts: {
			users: userCount,
			hubs: hubCount,
			papers: paperCount,
			publishedPapers: publishedPaperCount,
			declinedPapers: declinedPaperCount,
			reviewAssignments: reviewAssignmentCount,
			submittedReviews: submittedReviewCount,
			pendingInvitations: pendingInvitationCount
		},
		recentUsers: (recentUsers as Lean[]).map((user) => ({
			id: normalizeId(user.id || user._id),
			name: userDisplayName(user),
			email: user.email,
			emailVerified: !!user.emailVerified,
			createdAt: user.createdAt ?? null
		})),
		recentPapers: (recentPapers as Lean[]).map((paper) => ({
			id: normalizeId(paper.id || paper._id),
			title: paper.title,
			status: paper.status,
			declined: paper.rejectedByHub === true || paper.status === 'rejected',
			author: authorLabels.get(normalizeId(paper.mainAuthor))?.name ?? null,
			createdAt: paper.createdAt ?? null
		})),
		recentAdminActivity: (recentAdminActivity as Lean[]).map((event) => ({
			id: normalizeId(event._id),
			action: event.type,
			actor: actorLabels.get(normalizeId(event.actorId))?.name ?? null,
			resourceType: event.entityType,
			resourceId: event.entityId,
			result: event.metadata?.result ?? null,
			createdAt: event.createdAt ?? null
		}))
	});
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export async function listUsers(input: PaginationInput): Promise<Paginated<Lean>> {
	await start_mongo();

	const filter =
		buildSearchFilter(input.search, ['firstName', 'lastName', 'username', 'email', 'orcid']) ?? {};

	const [total, rows] = await Promise.all([
		Users.countDocuments(filter),
		Users.find(filter)
			.select(USER_FIELDS)
			.sort({ createdAt: -1 })
			.skip(input.skip)
			.limit(input.pageSize)
			.lean()
	]);

	const ids = uniqueIds((rows as Lean[]).flatMap((row) => [row.id, row._id]));

	const [globalRoles, hubRoleRows] = await Promise.all([
		UserRoleAssignment.find({ userId: { $in: ids }, scopeType: 'global', isActive: true })
			.select('userId roleKey')
			.lean(),
		UserRoleAssignment.find({ userId: { $in: ids }, scopeType: 'hub', isActive: true })
			.select('userId roleKey scopeId')
			.lean()
	]);

	const rolesByUser = new Map<string, string[]>();
	for (const assignment of globalRoles as Lean[]) {
		const key = String(assignment.userId);
		rolesByUser.set(key, [...(rolesByUser.get(key) ?? []), String(assignment.roleKey)]);
	}

	const hubCountByUser = new Map<string, number>();
	for (const assignment of hubRoleRows as Lean[]) {
		const key = String(assignment.userId);
		hubCountByUser.set(key, (hubCountByUser.get(key) ?? 0) + 1);
	}

	const items = (rows as Lean[]).map((user) => {
		const id = normalizeId(user.id || user._id);
		const altId = String(user._id ?? '');
		return {
			id,
			name: userDisplayName(user),
			username: user.username ?? null,
			email: user.email,
			orcid: user.orcid ?? null,
			institution: user.institution ?? null,
			emailVerified: !!user.emailVerified,
			billingStatus: user.billingStatus ?? null,
			globalRoles: [
				...new Set([...(rolesByUser.get(id) ?? []), ...(rolesByUser.get(altId) ?? [])])
			],
			hubRoleCount:
				(hubCountByUser.get(id) ?? 0) + (id === altId ? 0 : (hubCountByUser.get(altId) ?? 0)),
			createdAt: user.createdAt ?? null
		};
	});

	return paginate(serialize(items), total, input);
}

export async function getUserDetail(userId: string) {
	await start_mongo();

	const id = String(userId || '').trim();
	if (!id) return null;

	const user = (await Users.findOne({ $or: [{ id }, { _id: id }] })
		.select(USER_FIELDS)
		.lean()) as Lean | null;

	if (!user) return null;

	const aliases = uniqueIds([user.id, user._id]);

	const [assignments, paperCount, reviewAssignments, recentActivity] = await Promise.all([
		UserRoleAssignment.find({ userId: { $in: aliases }, isActive: true })
			.select('roleKey scopeType scopeId grantedBy createdAt')
			.sort({ scopeType: 1, roleKey: 1 })
			.lean(),
		Papers.countDocuments({
			$or: [{ mainAuthor: { $in: aliases } }, { submittedBy: { $in: aliases } }]
		}),
		ReviewAssignment.find({ reviewerId: { $in: aliases } })
			.select('paperId status assignedAt deadline completedAt hubId')
			.sort({ assignedAt: -1 })
			.limit(10)
			.lean(),
		ActivityEvent.find({ $or: [{ actorId: { $in: aliases } }, { targetUserId: { $in: aliases } }] })
			.sort({ createdAt: -1 })
			.limit(15)
			.lean()
	]);

	const hubIds = uniqueIds([
		...(assignments as Lean[]).filter((a) => a.scopeType === 'hub').map((a) => a.scopeId),
		...(reviewAssignments as Lean[]).map((a) => a.hubId)
	]);

	const [hubLabels, paperLabels] = await Promise.all([
		loadHubLabels(hubIds),
		loadPaperLabels((reviewAssignments as Lean[]).map((a) => a.paperId))
	]);

	return serialize({
		id: normalizeId(user.id || user._id),
		name: userDisplayName(user),
		username: user.username ?? null,
		email: user.email,
		orcid: user.orcid ?? null,
		institution: user.institution ?? null,
		position: user.position ?? null,
		emailVerified: !!user.emailVerified,
		billingStatus: user.billingStatus ?? null,
		createdAt: user.createdAt ?? null,
		updatedAt: user.updatedAt ?? null,
		paperCount,
		globalRoles: (assignments as Lean[])
			.filter((assignment) => assignment.scopeType === 'global')
			.map((assignment) => ({
				roleKey: String(assignment.roleKey),
				grantedBy: assignment.grantedBy ?? null,
				createdAt: assignment.createdAt ?? null
			})),
		hubRoles: (assignments as Lean[])
			.filter((assignment) => assignment.scopeType === 'hub')
			.map((assignment) => ({
				roleKey: String(assignment.roleKey),
				hubId: normalizeId(assignment.scopeId),
				hubTitle: hubLabels.get(normalizeId(assignment.scopeId))?.title ?? null,
				createdAt: assignment.createdAt ?? null
			})),
		reviewAssignments: (reviewAssignments as Lean[]).map((assignment) => ({
			paperId: normalizeId(assignment.paperId),
			paperTitle: paperLabels.get(normalizeId(assignment.paperId))?.title ?? null,
			hubTitle: hubLabels.get(normalizeId(assignment.hubId))?.title ?? null,
			status: assignment.status,
			assignedAt: assignment.assignedAt ?? null,
			deadline: assignment.deadline ?? null,
			completedAt: assignment.completedAt ?? null
		})),
		recentActivity: (recentActivity as Lean[]).map((event) => ({
			id: normalizeId(event._id),
			action: event.type,
			resourceType: event.entityType,
			resourceId: event.entityId,
			createdAt: event.createdAt ?? null
		}))
	});
}

/* -------------------------------------------------------------------------- */
/* Hubs                                                                        */
/* -------------------------------------------------------------------------- */

export async function listHubs(input: PaginationInput): Promise<Paginated<Lean>> {
	await start_mongo();

	const filter = buildSearchFilter(input.search, ['title', 'type', 'issn']) ?? {};

	const [total, rows] = await Promise.all([
		Hubs.countDocuments(filter),
		Hubs.find(filter)
			.select(HUB_FIELDS)
			.sort({ createdAt: -1 })
			.skip(input.skip)
			.limit(input.pageSize)
			.lean()
	]);

	const ownerLabels = await loadUserLabels((rows as Lean[]).map((hub) => hub.createdBy));

	const items = (rows as Lean[]).map((hub) => {
		const id = normalizeId(hub.id || hub._id);
		return {
			id,
			title: hub.title,
			slug: id,
			type: hub.type ?? null,
			status: hub.status ?? null,
			issn: hub.issn ?? null,
			owner: ownerLabels.get(normalizeId(hub.createdBy))?.name ?? null,
			ownerId: normalizeId(hub.createdBy),
			memberCount: Array.isArray(hub.assistantManagers) ? hub.assistantManagers.length : 0,
			reviewerCount: Array.isArray(hub.reviewers) ? hub.reviewers.length : 0,
			paperCount: Array.isArray(hub.submittedPapers) ? hub.submittedPapers.length : 0,
			createdAt: hub.createdAt ?? null
		};
	});

	return paginate(serialize(items), total, input);
}

/* -------------------------------------------------------------------------- */
/* Papers                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A paper is "declined" through either of two independent signals, and the rest of the
 * app treats them as one condition (`publish/view/[slug]/+page.svelte` renders
 * "Paper Declined" on `paper.rejectedByHub || paper.status === 'rejected'`):
 *
 *  - `status: 'rejected'`, the editorial status, and
 *  - `rejectedByHub: true`, the flag a hub sets when it turns a submission down.
 *
 * They can disagree: a hub can set the flag while the status stays wherever the paper
 * was. Filtering on `status` alone therefore hides declined papers, which is exactly
 * the bug this condition exists to prevent. Any query that means "declined" must use it.
 */
function declinedPaperCondition(): Lean {
	return { $or: [{ rejectedByHub: true }, { status: 'rejected' }] };
}

/** Synthetic filter value for the two-signal declined condition. Not a stored status. */
export const DECLINED_PAPER_FILTER = 'declined';

export async function listPapers(
	input: PaginationInput,
	filters: { status?: string; hubId?: string } = {}
): Promise<Paginated<Lean>> {
	await start_mongo();

	const conditions: Lean[] = [];

	const search = buildSearchFilter(input.search, ['title', 'doi']);
	if (search) conditions.push(search);
	if (filters.status === DECLINED_PAPER_FILTER) {
		conditions.push(declinedPaperCondition());
	} else if (filters.status) {
		conditions.push({ status: filters.status });
	}
	if (filters.hubId) conditions.push({ hubId: filters.hubId });

	const filter = conditions.length > 0 ? { $and: conditions } : {};

	const [total, rows] = await Promise.all([
		Papers.countDocuments(filter),
		Papers.find(filter)
			.select(PAPER_FIELDS)
			.sort({ createdAt: -1 })
			.skip(input.skip)
			.limit(input.pageSize)
			.lean()
	]);

	const [authorLabels, hubLabels] = await Promise.all([
		loadUserLabels((rows as Lean[]).flatMap((paper) => [paper.mainAuthor, paper.submittedBy])),
		loadHubLabels((rows as Lean[]).map((paper) => paper.hubId))
	]);

	const items = (rows as Lean[]).map((paper) => {
		const id = normalizeId(paper.id || paper._id);
		// Mirrors the app's own condition so a paper flagged by its hub reads as
		// Declined even when its status says something else.
		const declined = paper.rejectedByHub === true || paper.status === 'rejected';

		return {
			id,
			title: paper.title,
			status: paper.status,
			declined,
			declinedByHub: paper.rejectedByHub === true,
			declinedAt: paper.rejectedAt ?? null,
			doi: paper.doi ?? null,
			author: authorLabels.get(normalizeId(paper.mainAuthor))?.name ?? null,
			authorId: normalizeId(paper.mainAuthor),
			submittedBy: authorLabels.get(normalizeId(paper.submittedBy))?.name ?? null,
			hubId: paper.hubId ? normalizeId(paper.hubId) : null,
			hubTitle: hubLabels.get(normalizeId(paper.hubId))?.title ?? null,
			createdAt: paper.createdAt ?? null
		};
	});

	return paginate(serialize(items), total, input);
}

/** The editorial statuses `Paper.status` can actually hold. */
export const PAPER_STATUSES = [
	'draft',
	'reviewer assignment',
	'in review',
	'needing corrections',
	'under correction',
	'under final review',
	'awaiting final decision',
	'accepted',
	'published',
	'rejected'
] as const;

/**
 * What the admin status filter offers. `rejected` is replaced by the synthetic
 * `declined`, which is both the product's word for it and a strictly broader query:
 * it also catches papers flagged by a hub whose status never changed.
 */
export const PAPER_STATUS_FILTERS = [
	...PAPER_STATUSES.filter((status) => status !== 'rejected'),
	DECLINED_PAPER_FILTER
] as const;

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

export const REVIEW_ASSIGNMENT_STATUSES = [
	'pending',
	'accepted',
	'declined',
	'completed',
	'expired',
	'overdue',
	'removed'
] as const;

/**
 * The admin reviews screen is built on `ReviewAssignment`, the operational record
 * that carries hub, status and deadlines. The `Review` document is consulted only
 * for its submission state and round.
 *
 * Scientific content -- scores, recommendation, qualitative text, attachments -- is
 * deliberately never selected here. Platform administration is separated from the
 * content of a review: this screen is read-only and operational by construction.
 */
export async function listReviews(
	input: PaginationInput,
	filters: { status?: string } = {}
): Promise<Paginated<Lean>> {
	await start_mongo();

	const conditions: Lean[] = [];
	if (filters.status) conditions.push({ status: filters.status });

	// ReviewAssignment stores ids, not titles, so a free-text term is resolved
	// against papers and users first and then matched by id.
	const term = input.search.trim();
	if (term) {
		const [matchingPapers, matchingUsers] = await Promise.all([
			Papers.find(buildSearchFilter(term, ['title', 'doi']) ?? {})
				.select('id _id')
				.limit(200)
				.lean(),
			Users.find(buildSearchFilter(term, ['firstName', 'lastName', 'username', 'email']) ?? {})
				.select('id _id')
				.limit(200)
				.lean()
		]);

		const paperIds = uniqueIds((matchingPapers as Lean[]).flatMap((p) => [p.id, p._id]));
		const reviewerIds = uniqueIds((matchingUsers as Lean[]).flatMap((u) => [u.id, u._id]));

		conditions.push({
			$or: [{ paperId: { $in: paperIds } }, { reviewerId: { $in: reviewerIds } }]
		});
	}

	const filter = conditions.length > 0 ? { $and: conditions } : {};

	const [total, rows] = await Promise.all([
		ReviewAssignment.countDocuments(filter),
		ReviewAssignment.find(filter)
			.select('id _id paperId reviewerId hubId status assignedAt acceptedAt deadline completedAt')
			.sort({ assignedAt: -1 })
			.skip(input.skip)
			.limit(input.pageSize)
			.lean()
	]);

	const paperIds = uniqueIds((rows as Lean[]).map((row) => row.paperId));
	const reviewerIds = uniqueIds((rows as Lean[]).map((row) => row.reviewerId));

	const [paperLabels, reviewerLabels, hubLabels, reviewDocs] = await Promise.all([
		loadPaperLabels(paperIds),
		loadUserLabels(reviewerIds),
		loadHubLabels((rows as Lean[]).map((row) => row.hubId)),
		ReviewModel.find({ paperId: { $in: paperIds }, reviewerId: { $in: reviewerIds } })
			.select('paperId reviewerId status reviewRound submissionDate')
			.lean()
	]);

	const reviewByPair = new Map<string, Lean>();
	for (const review of reviewDocs as Lean[]) {
		reviewByPair.set(`${normalizeId(review.paperId)}|${normalizeId(review.reviewerId)}`, review);
	}

	const items = (rows as Lean[]).map((row) => {
		const paperId = normalizeId(row.paperId);
		const reviewerId = normalizeId(row.reviewerId);
		const review = reviewByPair.get(`${paperId}|${reviewerId}`);
		const hubId = row.hubId ? normalizeId(row.hubId) : (paperLabels.get(paperId)?.hubId ?? null);

		return {
			id: normalizeId(row.id || row._id),
			paperId,
			paperTitle: paperLabels.get(paperId)?.title ?? null,
			paperStatus: paperLabels.get(paperId)?.status ?? null,
			paperDeclined: paperLabels.get(paperId)?.declined === true,
			reviewerId,
			reviewer: reviewerLabels.get(reviewerId)?.name ?? null,
			hubId,
			hubTitle: hubId ? (hubLabels.get(hubId)?.title ?? null) : null,
			status: row.status,
			reviewStatus: review?.status ?? null,
			reviewRound: review?.reviewRound ?? null,
			assignedAt: row.assignedAt ?? null,
			acceptedAt: row.acceptedAt ?? null,
			deadline: row.deadline ?? null,
			completedAt: row.completedAt ?? null
		};
	});

	return paginate(serialize(items), total, input);
}

/* -------------------------------------------------------------------------- */
/* Invitations                                                                 */
/* -------------------------------------------------------------------------- */

export const INVITATION_STATUSES = [
	'pending',
	'accepted',
	'declined',
	'expired',
	'cancelled',
	'duplicate'
] as const;

export async function listInvitations(
	input: PaginationInput,
	filters: { status?: string } = {}
): Promise<Paginated<Lean>> {
	await start_mongo();

	const conditions: Lean[] = [];
	if (filters.status) conditions.push({ status: filters.status });

	const term = input.search.trim();
	if (term) {
		const [matchingPapers, matchingUsers] = await Promise.all([
			Papers.find(buildSearchFilter(term, ['title', 'doi']) ?? {})
				.select('id _id')
				.limit(200)
				.lean(),
			Users.find(buildSearchFilter(term, ['firstName', 'lastName', 'username', 'email']) ?? {})
				.select('id _id')
				.limit(200)
				.lean()
		]);

		const paperIds = uniqueIds((matchingPapers as Lean[]).flatMap((p) => [p.id, p._id]));
		const userIds = uniqueIds((matchingUsers as Lean[]).flatMap((u) => [u.id, u._id]));

		conditions.push({
			$or: [{ paperId: { $in: paperIds } }, { reviewerId: { $in: userIds } }]
		});
	}

	const filter = conditions.length > 0 ? { $and: conditions } : {};

	const [total, rows] = await Promise.all([
		PaperReviewInvitation.countDocuments(filter),
		PaperReviewInvitation.find(filter)
			.select(INVITATION_FIELDS)
			.sort({ invitedAt: -1 })
			.skip(input.skip)
			.limit(input.pageSize)
			.lean()
	]);

	const [paperLabels, userLabels, hubLabels] = await Promise.all([
		loadPaperLabels((rows as Lean[]).map((row) => row.paperId)),
		loadUserLabels((rows as Lean[]).flatMap((row) => [row.reviewerId, row.invitedBy])),
		loadHubLabels((rows as Lean[]).map((row) => row.hubId))
	]);

	const items = (rows as Lean[]).map((row) => {
		const paperId = normalizeId(row.paperId);
		const hubId = row.hubId ? normalizeId(row.hubId) : null;

		return {
			id: normalizeId(row.id || row._id),
			paperId,
			paperTitle: paperLabels.get(paperId)?.title ?? null,
			recipient: userLabels.get(normalizeId(row.reviewerId))?.name ?? null,
			recipientEmail: userLabels.get(normalizeId(row.reviewerId))?.email ?? null,
			sender: userLabels.get(normalizeId(row.invitedBy))?.name ?? null,
			hubId,
			hubTitle: hubId ? (hubLabels.get(hubId)?.title ?? null) : null,
			type: 'paper_review',
			status: row.status,
			invitedAt: row.invitedAt ?? row.createdAt ?? null,
			expiresAt: row.expiresAt ?? null,
			respondedAt: row.respondedAt ?? null,
			resendCount: row.resendCount ?? 0
		};
	});

	return paginate(serialize(items), total, input);
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

export async function listActivity(
	input: PaginationInput,
	filters: { adminOnly?: boolean } = {}
): Promise<Paginated<Lean>> {
	await start_mongo();

	const conditions: Lean[] = [];
	if (filters.adminOnly !== false) conditions.push({ type: { $regex: '^admin\\.' } });

	const search = buildSearchFilter(input.search, ['type', 'entityType', 'entityId']);
	if (search) conditions.push(search);

	const filter = conditions.length > 0 ? { $and: conditions } : {};

	const [total, rows] = await Promise.all([
		ActivityEvent.countDocuments(filter),
		ActivityEvent.find(filter).sort({ createdAt: -1 }).skip(input.skip).limit(input.pageSize).lean()
	]);

	const actorLabels = await loadUserLabels((rows as Lean[]).map((row) => row.actorId));

	const items = (rows as Lean[]).map((row) => ({
		id: normalizeId(row._id),
		action: row.type,
		actorId: row.actorId ? normalizeId(row.actorId) : null,
		actor: actorLabels.get(normalizeId(row.actorId))?.name ?? null,
		resourceType: row.entityType,
		resourceId: row.entityId,
		result: row.metadata?.result ?? null,
		createdAt: row.createdAt ?? null
	}));

	return paginate(serialize(items), total, input);
}
