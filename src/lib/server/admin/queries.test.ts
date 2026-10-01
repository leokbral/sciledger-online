import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaginationInput } from './pagination';

/**
 * A minimal stand-in for a Mongoose model that records the filter, projection and
 * paging it was handed, so the tests can assert both the result shape and the query
 * that produced it.
 */
function createModel(rows: any[] = []) {
	const state: Record<string, any> = {
		rows,
		filter: undefined,
		select: undefined,
		skip: undefined,
		limit: undefined,
		countFilter: undefined,
		created: []
	};

	function chain(single: boolean) {
		const query: any = {
			select: (projection: any) => {
				state.select = projection;
				return query;
			},
			sort: () => query,
			skip: (value: number) => {
				state.skip = value;
				return query;
			},
			limit: (value: number) => {
				state.limit = value;
				return query;
			},
			session: () => query,
			lean: async () => (single ? (state.rows[0] ?? null) : state.rows),
			exec: async () => (single ? (state.rows[0] ?? null) : state.rows),
			then: undefined
		};
		return query;
	}

	return {
		__state: state,
		setRows(next: any[]) {
			state.rows = next;
		},
		find(filter: any) {
			state.filter = filter;
			return chain(false);
		},
		findOne(filter: any) {
			state.filter = filter;
			return chain(true);
		},
		async countDocuments(filter: any) {
			state.countFilter = filter;
			return state.rows.length;
		},
		async create(docs: any[]) {
			state.created.push(...docs);
			return docs;
		}
	};
}

/**
 * A `vi.mock` factory runs once per test file and its result is cached, so a mock
 * that closed over the model object directly would keep serving the instance built
 * by the first `beforeEach`. Each mocked model is therefore a thin proxy that looks
 * the current instance up at call time.
 */
const harness = vi.hoisted(() => {
	const models: Record<string, any> = {};
	const proxy = (key: string) => ({
		find: (...args: any[]) => models[key].find(...args),
		findOne: (...args: any[]) => models[key].findOne(...args),
		countDocuments: (...args: any[]) => models[key].countDocuments(...args),
		create: (...args: any[]) => models[key].create(...args)
	});
	return { models, proxy };
});

const models = harness.models;

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/db/models/User', () => ({ default: harness.proxy('users') }));
vi.mock('$lib/db/models/Hub', () => ({ default: harness.proxy('hubs') }));
vi.mock('$lib/db/models/Paper', () => ({ default: harness.proxy('papers') }));
vi.mock('$lib/db/models/ReviewAssignment', () => ({
	default: harness.proxy('reviewAssignments')
}));
vi.mock('$lib/db/models/Review', () => ({ default: harness.proxy('reviews') }));
vi.mock('$lib/db/models/PaperReviewInvitation', () => ({ default: harness.proxy('invitations') }));
vi.mock('$lib/db/models/ActivityEvent', () => ({ default: harness.proxy('activity') }));
vi.mock('$lib/db/models/UserRoleAssignment', () => ({ default: harness.proxy('roleAssignments') }));

const pagination: PaginationInput = { page: 1, pageSize: 25, skip: 0, search: '' };

/** A user document carrying every secret the schema can hold. */
const USER_WITH_SECRETS = {
	id: 'user-1',
	_id: 'user-1',
	firstName: 'Ada',
	lastName: 'Lovelace',
	username: 'ada',
	email: 'ada@example.com',
	orcid: '0000-0002-1825-0097',
	institution: 'Analytical Engine Lab',
	emailVerified: true,
	billingStatus: 'current',
	createdAt: '2026-01-01T00:00:00.000Z',
	// None of the following may ever reach a response.
	password: '$2b$10$hashedpassword',
	refreshToken: 'refresh-token-value',
	resetPasswordTokenHash: 'reset-hash',
	emailVerificationTokenHash: 'verification-hash',
	pendingEmailTokenHash: 'pending-hash',
	orcidAccessToken: 'orcid-access-token',
	orcidRefreshToken: 'orcid-refresh-token',
	reviewerPayments: { stripeConnectAccountId: 'acct_123', onboardingComplete: true }
};

const SECRET_VALUES = [
	'$2b$10$hashedpassword',
	'refresh-token-value',
	'reset-hash',
	'verification-hash',
	'pending-hash',
	'orcid-access-token',
	'orcid-refresh-token',
	'acct_123'
];

const SECRET_KEYS = [
	'password',
	'refreshToken',
	'resetPasswordTokenHash',
	'emailVerificationTokenHash',
	'pendingEmailTokenHash',
	'orcidAccessToken',
	'orcidRefreshToken',
	'reviewerPayments'
];

function expectNoSecrets(payload: unknown) {
	const serialized = JSON.stringify(payload);

	for (const value of SECRET_VALUES) {
		expect(serialized).not.toContain(value);
	}
	for (const key of SECRET_KEYS) {
		expect(serialized).not.toContain(key);
	}
}

beforeEach(() => {
	models.users = createModel([]);
	models.hubs = createModel([]);
	models.papers = createModel([]);
	models.reviewAssignments = createModel([]);
	models.reviews = createModel([]);
	models.invitations = createModel([]);
	models.activity = createModel([]);
	models.roleAssignments = createModel([]);
});

describe('listUsers', () => {
	it('never returns credentials, tokens or Stripe identifiers', async () => {
		models.users.setRows([USER_WITH_SECRETS]);
		const { listUsers } = await import('./queries');

		const result = await listUsers(pagination);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].email).toBe('ada@example.com');
		expectNoSecrets(result);
	});

	it('projects an allowlist that contains no secret field', async () => {
		models.users.setRows([USER_WITH_SECRETS]);
		const { listUsers } = await import('./queries');

		await listUsers(pagination);

		const projection = String(models.users.__state.select);
		for (const key of SECRET_KEYS) {
			expect(projection).not.toContain(key);
		}
		expect(projection).toContain('email');
	});

	it('applies skip and limit from the pagination input', async () => {
		const { listUsers } = await import('./queries');

		await listUsers({ page: 3, pageSize: 10, skip: 20, search: '' });

		expect(models.users.__state.skip).toBe(20);
		expect(models.users.__state.limit).toBe(10);
	});

	it('searches across name, username, e-mail and ORCID iD', async () => {
		const { listUsers } = await import('./queries');

		await listUsers({ ...pagination, search: 'ada' });

		const filter = models.users.__state.filter;
		const fields = filter.$or.map((clause: any) => Object.keys(clause)[0]);
		expect(fields).toEqual(['firstName', 'lastName', 'username', 'email', 'orcid']);
		expect(filter.$or[0].firstName.$options).toBe('i');
	});

	it('counts with the same filter it queries with, so totals match the rows', async () => {
		const { listUsers } = await import('./queries');

		await listUsers({ ...pagination, search: 'ada' });

		expect(models.users.__state.countFilter).toEqual(models.users.__state.filter);
	});

	it('reports global role keys and hub role counts from role assignments', async () => {
		models.users.setRows([USER_WITH_SECRETS]);
		models.roleAssignments.setRows([
			{ userId: 'user-1', roleKey: 'Author', scopeType: 'global' },
			{ userId: 'user-1', roleKey: 'SuperAdmin', scopeType: 'global' }
		]);
		const { listUsers } = await import('./queries');

		const result = await listUsers(pagination);

		expect(result.items[0].globalRoles).toContain('SuperAdmin');
		expect(result.items[0].globalRoles).toContain('Author');
	});
});

describe('getUserDetail', () => {
	it('returns null for an unknown id instead of throwing', async () => {
		const { getUserDetail } = await import('./queries');

		expect(await getUserDetail('does-not-exist')).toBeNull();
	});

	it('returns null for an empty id without querying', async () => {
		const { getUserDetail } = await import('./queries');

		expect(await getUserDetail('')).toBeNull();
	});

	it('never returns credentials or tokens', async () => {
		models.users.setRows([USER_WITH_SECRETS]);
		const { getUserDetail } = await import('./queries');

		const profile = await getUserDetail('user-1');

		expect(profile?.email).toBe('ada@example.com');
		expectNoSecrets(profile);
	});
});

describe('getDashboardMetrics', () => {
	it('exposes counts and recent records without leaking secrets', async () => {
		models.users.setRows([USER_WITH_SECRETS]);
		models.papers.setRows([
			{ id: 'paper-1', title: 'On Computable Numbers', status: 'published', mainAuthor: 'user-1' }
		]);
		const { getDashboardMetrics } = await import('./queries');

		const metrics = await getDashboardMetrics();

		expect(metrics.counts.users).toBe(1);
		expect(metrics.counts.papers).toBe(1);
		expect(metrics.recentUsers[0].email).toBe('ada@example.com');
		expectNoSecrets(metrics);
	});

	it('limits the recent lists instead of loading whole collections', async () => {
		const { getDashboardMetrics } = await import('./queries');

		await getDashboardMetrics();

		expect(models.users.__state.limit).toBe(5);
		expect(models.papers.__state.limit).toBe(5);
	});
});

describe('listPapers', () => {
	it('filters by status and hub with an $and of explicit conditions', async () => {
		const { listPapers } = await import('./queries');

		await listPapers({ ...pagination, search: 'numbers' }, { status: 'published', hubId: 'hub-1' });

		const filter = models.papers.__state.filter;
		expect(filter.$and).toHaveLength(3);
		expect(filter.$and).toEqual(
			expect.arrayContaining([{ status: 'published' }, { hubId: 'hub-1' }])
		);
	});

	it('queries unfiltered when no search or filter is supplied', async () => {
		const { listPapers } = await import('./queries');

		await listPapers(pagination);

		expect(models.papers.__state.filter).toEqual({});
	});

	it('resolves author and hub labels without a query per row', async () => {
		models.papers.setRows([
			{ id: 'p1', title: 'A', status: 'draft', mainAuthor: 'user-1', hubId: 'hub-1' },
			{ id: 'p2', title: 'B', status: 'draft', mainAuthor: 'user-1', hubId: 'hub-1' }
		]);
		models.users.setRows([{ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' }]);
		models.hubs.setRows([{ id: 'hub-1', title: 'Hub One', type: 'Journal' }]);
		const { listPapers } = await import('./queries');

		const result = await listPapers(pagination);

		expect(result.items[0].author).toBe('Ada Lovelace');
		expect(result.items[0].hubTitle).toBe('Hub One');
		// One batched $in lookup each, not one per paper.
		expect(models.users.__state.filter.$or[0].id.$in).toEqual(['user-1']);
		expect(models.hubs.__state.filter.$or[0].id.$in).toEqual(['hub-1']);
	});
});

/**
 * Regression tests for the bug these exist because of: `/admin/papers` filtered on
 * `status` alone, so a paper a hub declined through `rejectedByHub` -- whose status was
 * left wherever it was -- was invisible in the administration area.
 */
describe('declined papers', () => {
	it('offers Declined in the filter list and does not offer the raw rejected status', async () => {
		const { PAPER_STATUS_FILTERS, PAPER_STATUSES, DECLINED_PAPER_FILTER } =
			await import('./queries');

		expect(PAPER_STATUS_FILTERS).toContain(DECLINED_PAPER_FILTER);
		expect(PAPER_STATUS_FILTERS).not.toContain('rejected');
		// The stored enum still describes the database faithfully.
		expect(PAPER_STATUSES).toContain('rejected');
	});

	it('queries BOTH signals, so a hub-declined paper cannot be missed', async () => {
		const { listPapers, DECLINED_PAPER_FILTER } = await import('./queries');

		await listPapers(pagination, { status: DECLINED_PAPER_FILTER });

		expect(models.papers.__state.filter.$and).toEqual([
			{ $or: [{ rejectedByHub: true }, { status: 'rejected' }] }
		]);
	});

	it('returns a paper flagged by its hub even though its status is not rejected', async () => {
		models.papers.setRows([
			{
				id: 'p1',
				title: 'Declined by the hub',
				status: 'in review',
				rejectedByHub: true,
				rejectedAt: new Date('2026-02-01'),
				mainAuthor: 'user-1'
			}
		]);
		const { listPapers, DECLINED_PAPER_FILTER } = await import('./queries');

		const result = await listPapers(pagination, { status: DECLINED_PAPER_FILTER });

		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toMatchObject({
			title: 'Declined by the hub',
			status: 'in review',
			declined: true,
			declinedByHub: true
		});
	});

	it('also treats a plain rejected status as declined', async () => {
		models.papers.setRows([
			{ id: 'p2', title: 'Rejected editorially', status: 'rejected', mainAuthor: 'user-1' }
		]);
		const { listPapers } = await import('./queries');

		const result = await listPapers(pagination);

		expect(result.items[0]).toMatchObject({ declined: true, declinedByHub: false });
	});

	it('does not mark an ordinary paper as declined', async () => {
		models.papers.setRows([
			{ id: 'p3', title: 'Still in review', status: 'in review', mainAuthor: 'user-1' }
		]);
		const { listPapers } = await import('./queries');

		const result = await listPapers(pagination);

		expect(result.items[0]).toMatchObject({ declined: false, declinedByHub: false });
	});

	it('selects the hub-decline fields, without pulling the free-text reason', async () => {
		const { listPapers } = await import('./queries');

		await listPapers(pagination);

		const projection = String(models.papers.__state.select);
		expect(projection).toContain('rejectedByHub');
		expect(projection).toContain('rejectedAt');
		expect(projection).not.toContain('rejectionReason');
	});

	it('counts declined papers on the dashboard with the same two-signal condition', async () => {
		const { getDashboardMetrics } = await import('./queries');

		await getDashboardMetrics();

		// The last countDocuments the papers model saw is the declined one.
		expect(models.papers.__state.countFilter).toEqual({
			$or: [{ rejectedByHub: true }, { status: 'rejected' }]
		});
	});

	it('marks a hub-declined paper as declined in the dashboard recent list', async () => {
		models.papers.setRows([
			{
				id: 'p1',
				title: 'Declined by the hub',
				status: 'awaiting final decision',
				rejectedByHub: true,
				mainAuthor: 'user-1'
			}
		]);
		const { getDashboardMetrics } = await import('./queries');

		const metrics = await getDashboardMetrics();

		expect(metrics.recentPapers[0].declined).toBe(true);
	});

	it('propagates the flag to the reviews screen through the paper label lookup', async () => {
		models.reviewAssignments.setRows([
			{ id: 'ra-1', paperId: 'p1', reviewerId: 'user-1', status: 'accepted' }
		]);
		models.papers.setRows([
			{ id: 'p1', title: 'Declined', status: 'in review', rejectedByHub: true }
		]);
		const { listReviews } = await import('./queries');

		const result = await listReviews(pagination);

		expect(result.items[0].paperDeclined).toBe(true);
		expect(result.items[0].paperStatus).toBe('in review');
	});
});

describe('listHubs', () => {
	it('returns member, reviewer and paper counts', async () => {
		models.hubs.setRows([
			{
				id: 'hub-1',
				title: 'Hub One',
				type: 'Journal',
				status: 'open',
				createdBy: 'user-1',
				assistantManagers: ['a', 'b'],
				reviewers: ['c'],
				submittedPapers: ['p1', 'p2', 'p3']
			}
		]);
		const { listHubs } = await import('./queries');

		const result = await listHubs(pagination);

		expect(result.items[0]).toMatchObject({
			title: 'Hub One',
			memberCount: 2,
			reviewerCount: 1,
			paperCount: 3
		});
	});

	it('searches title, type and ISSN', async () => {
		const { listHubs } = await import('./queries');

		await listHubs({ ...pagination, search: 'journal' });

		const fields = models.hubs.__state.filter.$or.map((c: any) => Object.keys(c)[0]);
		expect(fields).toEqual(['title', 'type', 'issn']);
	});
});

describe('listReviews', () => {
	it('never selects scientific content from the review document', async () => {
		models.reviewAssignments.setRows([
			{
				id: 'ra-1',
				paperId: 'p1',
				reviewerId: 'user-1',
				hubId: 'hub-1',
				status: 'accepted',
				assignedAt: new Date('2026-01-01')
			}
		]);
		models.reviews.setRows([
			{
				paperId: 'p1',
				reviewerId: 'user-1',
				status: 'submitted',
				reviewRound: 1,
				averageScore: 4.5,
				recommendation: { decision: 'accept' },
				qualitativeEvaluation: { comments: 'Confidential reviewer comments' }
			}
		]);
		const { listReviews } = await import('./queries');

		const result = await listReviews(pagination);

		expect(result.items[0].reviewStatus).toBe('submitted');
		expect(result.items[0].reviewRound).toBe(1);

		const projection = String(models.reviews.__state.select);
		expect(projection).not.toContain('averageScore');
		expect(projection).not.toContain('recommendation');
		expect(projection).not.toContain('qualitativeEvaluation');

		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain('Confidential reviewer comments');
		expect(serialized).not.toContain('4.5');
	});

	it('filters by assignment status', async () => {
		const { listReviews } = await import('./queries');

		await listReviews(pagination, { status: 'overdue' });

		expect(models.reviewAssignments.__state.filter.$and).toEqual([{ status: 'overdue' }]);
	});
});

describe('listInvitations', () => {
	it('returns operational fields and no invitation token', async () => {
		models.invitations.setRows([
			{
				id: 'inv-1',
				paperId: 'p1',
				reviewerId: 'user-1',
				invitedBy: 'user-2',
				hubId: 'hub-1',
				status: 'pending',
				invitedAt: new Date('2026-01-01'),
				expiresAt: new Date('2026-01-08'),
				resendCount: 2
			}
		]);
		const { listInvitations } = await import('./queries');

		const result = await listInvitations(pagination);

		expect(result.items[0]).toMatchObject({ status: 'pending', resendCount: 2 });

		const projection = String(models.invitations.__state.select);
		expect(projection).not.toContain('token');
		expect(projection).not.toContain('Hash');
	});

	it('filters by invitation status', async () => {
		const { listInvitations } = await import('./queries');

		await listInvitations(pagination, { status: 'expired' });

		expect(models.invitations.__state.filter.$and).toEqual([{ status: 'expired' }]);
	});
});

describe('listActivity', () => {
	it('restricts the feed to administrative events by default', async () => {
		const { listActivity } = await import('./queries');

		await listActivity(pagination);

		expect(models.activity.__state.filter.$and).toEqual([{ type: { $regex: '^admin\\.' } }]);
	});

	it('widens to every event when adminOnly is false', async () => {
		const { listActivity } = await import('./queries');

		await listActivity(pagination, { adminOnly: false });

		expect(models.activity.__state.filter).toEqual({});
	});

	it('reports the actor for each event', async () => {
		models.activity.setRows([
			{
				_id: 'evt-1',
				type: 'admin.user.view',
				actorId: 'user-1',
				entityType: 'user',
				entityId: 'user-2',
				metadata: { result: 'allowed' },
				createdAt: new Date('2026-01-01')
			}
		]);
		models.users.setRows([{ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' }]);
		const { listActivity } = await import('./queries');

		const result = await listActivity(pagination);

		expect(result.items[0]).toMatchObject({
			action: 'admin.user.view',
			actor: 'Ada Lovelace',
			actorId: 'user-1',
			resourceType: 'user',
			resourceId: 'user-2',
			result: 'allowed'
		});
	});
});
