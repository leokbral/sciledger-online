import { start_mongo } from '$lib/db/mongooseConnection';
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Users from '$lib/db/models/User';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import Invitation from '$lib/db/models/Invitation';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';
import { canManageHub, isHubViceManager } from '$lib/helpers/hubPermissions';

function getIdAliases(value: unknown): string[] {
	if (!value) return [];

	if (typeof value === 'string') {
		return [String(value)];
	}

	if (typeof value !== 'object') {
		return [];
	}

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};

	const aliases = [candidate.id, candidate._id]
		.filter(Boolean)
		.map((alias) => String(alias));

	const stringified = candidate.toString?.();
	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases));
}

function matchesUser(value: unknown, userId: string): boolean {
	return getIdAliases(value).includes(String(userId));
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	const fetchHub = async () => {
		const hub = await Hubs.findById(params.id)
			.populate('createdBy', 'firstName lastName name email profilePictureUrl')
			.populate('assistantManagers', '_id firstName lastName email profilePictureUrl')
			.populate('reviewers', '_id firstName lastName email profilePictureUrl')
			.lean();

		if (!hub) {
			throw error(404, 'Hub not found');
		}

		return hub;
	};

	const fetchUsers = async () => {
		const users = await Users.find({}, {}).lean().exec();
		return users;
	};

	const fetchPapers = async () => {
		const hub = await Hubs.findById(params.id).lean();
		if (!hub) {
			throw error(404, 'Hub not found');
		}
		const isManager = canManageHub(hub as any, locals.user.id);
		const isHubReviewer = hub.reviewers?.includes(locals.user.id);

		console.log('🔍 Fetching papers for user:', locals.user.id);
		console.log('📊 isManager:', isManager, 'isHubReviewer:', isHubReviewer);

		let paperQuery;

		if (isManager) {
			// Managers do hub (owner/vice): veem todos os papers exceto drafts
			paperQuery = { 
				hubId: params.id,
				status: { $ne: 'draft' }
			};
		} else {
			// Outros usuários: vê papers onde é revisor, autor ou publicados
			paperQuery = {
				hubId: params.id,
				$or: [
					{ status: 'published' },
					{ 
						reviewers: { $in: [locals.user.id] }, 
						status: { $ne: 'draft' } 
					}, // Papers onde é revisor (não draft)
					{
						status: { $ne: 'published' },
						$or: [
							{ mainAuthor: locals.user.id },
							{ correspondingAuthor: locals.user.id },
							{ coAuthors: { $in: [locals.user.id] } },
							{ submittedBy: locals.user.id }
						]
					}
				]
			};
		}

		console.log('📋 Paper query:', JSON.stringify(paperQuery, null, 2));
		console.log('👤 User ID:', locals.user.id);

		const papersRaw = await Papers.find(paperQuery)
			.populate("mainAuthor")
			.populate("coAuthors")
			.populate("submittedBy")
			.populate("reviewers")
			.lean()
			.exec();

		console.log('📄 Found', papersRaw.length, 'papers');
		papersRaw.forEach(p => {
			console.log(`  - Paper: ${p.title} (${p.id})`);
			console.log(`    Status: ${p.status}`);
			console.log(`    Reviewers: ${p.reviewers?.map(r => typeof r === 'object' ? r._id : r).join(', ') || 'none'}`);
		});

		// Normalizar peer_review para evitar erro de serialização
		const papers = papersRaw.map(paper => {
			const peer_review = paper.peer_review
				? {
					reviewType: paper.peer_review.reviewType,
					assignedReviewers: paper.peer_review.assignedReviewers ?? [],
					responses: paper.peer_review.responses ?? [],
					reviews: paper.peer_review.reviews ?? [],
					averageScore: paper.peer_review.averageScore ?? 0,
					reviewCount: paper.peer_review.reviewCount ?? 0,
					reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
				}
				: {
					reviewType: "open",
					assignedReviewers: [],
					responses: [],
					reviews: [],
					averageScore: 0,
					reviewCount: 0,
					reviewStatus: "not_started"
				};

			// Marcar se o usuário é revisor deste paper (está no campo reviewers)
			// reviewers pode conter objetos populados ou strings
			const reviewerIds =
				paper.reviewers?.flatMap((reviewer: any) => getIdAliases(reviewer)) || [];
			const isAcceptedForReview =
				reviewerIds.includes(locals.user.id) ||
				(paper.peer_review?.responses ?? []).some((response: any) => {
					return (
						matchesUser(response?.reviewerId, locals.user.id) &&
						(response?.status === 'accepted' || response?.status === 'completed')
					);
				});
			
			console.log(`  📋 Paper ${paper.id} - isAcceptedForReview: ${isAcceptedForReview}`);
			console.log(`     Reviewer IDs: [${reviewerIds.join(', ')}]`);
			console.log(`     User ID: ${locals.user.id}`);

			return {
				...paper,
				peer_review,
				isAcceptedForReview
			};
		});

		// Sanitize to remove non-serializable subdocument fields
		const sanitizedPapers = papers.map(sanitizePaper);
		return sanitizedPapers;
	};

	try {
		const hubData = await fetchHub();
		const usersData = await fetchUsers();
		const papersData = await fetchPapers();
		
		console.log('🏁 Starting ReviewAssignments fetch');
		console.log('👤 User ID:', locals.user.id);
		console.log('🏢 Hub createdBy:', hubData.createdBy);
		console.log('🏢 Hub createdBy type:', typeof hubData.createdBy);
		
		// Buscar ReviewAssignments para este hub (apenas para manager do hub)
		const createdById = typeof hubData.createdBy === 'object' 
			? (hubData.createdBy._id || hubData.createdBy.id || hubData.createdBy)
			: hubData.createdBy;
		const isCreator = createdById.toString() === locals.user.id;
		const isViceManager = isHubViceManager(hubData as any, locals.user.id);
		const isHubManager = isCreator || isViceManager;
		let reviewAssignments: any[] = [];
		let pendingPaperInvitations: Array<{ paperId: string; reviewerId: string }> = [];
		
		console.log('🔍 Fetching ReviewAssignments - isHubManager:', isHubManager);
		console.log('📋 Hub ID:', params.id);
		
		if (isHubManager) {
			const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;
			const assignmentsRaw = await ReviewAssignment.find({ 
				hubId: params.id,
				status: { $in: ['accepted', 'pending'] }
			})
				.populate('reviewerId')
				.lean()
				.exec();
			
			console.log('✅ Found ReviewAssignments:', assignmentsRaw.length);
			
			// Converter para formato serializável (evitar objetos populados)
			reviewAssignments = assignmentsRaw.map((ra: any) => ({
				_id: ra._id,
				id: ra.id,
				paperId: ra.paperId,
				reviewerId: typeof ra.reviewerId === 'object' ? (ra.reviewerId?._id || ra.reviewerId?.id) : ra.reviewerId,
				status: ra.status,
				deadline: ra.deadline,
				hubId: ra.hubId,
				assignedAt: ra.assignedAt,
				acceptedAt: ra.acceptedAt,
				updatedAt: ra.updatedAt
			}));
			
			assignmentsRaw.forEach((ra: any, idx: number) => {
				console.log(`  - Assignment ${idx + 1}:`, {
					_id: ra._id,
					paperId: ra.paperId,
					reviewerId: typeof ra.reviewerId === 'object' ? ra.reviewerId._id : ra.reviewerId,
					deadline: ra.deadline,
					status: ra.status
				});
			});

			const pendingInvitesRaw = await PaperReviewInvitation.find({
				hubId: params.id,
				status: 'pending'
			})
				.select('paper reviewer')
				.lean();

			pendingPaperInvitations = pendingInvitesRaw
				.map((invite: any) => ({
					paperId: String(invite?.paper || '').trim(),
					reviewerId: String(invite?.reviewer || '').trim()
				}))
				.filter((invite) => invite.paperId && invite.reviewerId);
		} else {
			console.log('❌ User is NOT hub manager, skipping ReviewAssignments fetch');
		}

		// Buscar convites pendentes para o usuário neste hub
		let hubInvitations = [];
		let paperReviewInvitations = [];
		
		console.log('🔔 Fetching invitations for hub:', params.id, 'user:', locals.user.id);
		
		// Hub invitations
		const hubInvitesRaw = await Invitation.find({ 
			reviewer: locals.user.id, 
			hubId: params.id,
			status: 'pending' 
		})
		.populate({
			path: 'hubId',
			select: 'title type description logoUrl'
		})
		.lean();
		
		hubInvitations = hubInvitesRaw.map((inv: any) => ({
			_id: String(inv._id),
			hubId: typeof inv.hubId === 'object' ? inv.hubId : null,
			role: inv.role || 'reviewer',
			status: inv.status,
			createdAt: inv.createdAt
		}));
		
		console.log('✅ Found hub invitations:', hubInvitations.length);
		
		// Paper review invitations for papers in this hub
		const paperReviewInvitesRaw = await PaperReviewInvitation.find({ 
			reviewer: locals.user.id,
			hubId: params.id,
			status: 'pending'
		})
		.populate({
			path: 'paper',
			select: 'title hubId'
		})
		.populate({
			path: 'invitedBy',
			select: 'firstName lastName'
		})
		.lean();
		
		paperReviewInvitations = (paperReviewInvitesRaw as any[])
			.filter(inv => inv.paper) // Filter out invites for deleted papers
			.map(inv => ({
				_id: String(inv._id),
				paperId: typeof inv.paper === 'object' ? inv.paper : null,
				invitedBy: typeof inv.invitedBy === 'object' ? inv.invitedBy : null,
				status: inv.status,
				createdAt: inv.createdAt
			}));
		
		console.log('✅ Found paper review invitations:', paperReviewInvitations.length);

		return {
			hub: hubData,
			users: usersData,
			papers: papersData,
			isCreator,
			isViceManager,
			isHubManager,
			reviewAssignments: reviewAssignments,
			pendingPaperInvitations,
			hubInvitations: hubInvitations,
			paperReviewInvitations: paperReviewInvitations
		};
	} catch (e) {
		console.error('Error loading data:', e);
		throw error(500, 'Error loading page data');
	}
}
