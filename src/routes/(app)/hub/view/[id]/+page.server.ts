import { start_mongo } from '$lib/db/mongooseConnection';
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Users from '$lib/db/models/User';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import Invitation from '$lib/db/models/Invitation';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
	getEffectiveHubMemberForUser,
	resolveEffectiveHubRoles
} from '$lib/server/authorization/effectiveHubRoles';

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

	const fetchPapers = async (canViewAllHubPapers: boolean) => {
		let paperQuery;

		if (canViewAllHubPapers) {
			// Usuários com permissão editorial efetiva no hub veem todos os papers exceto drafts.
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


		const papersRaw = await Papers.find(paperQuery)
			.populate("mainAuthor")
			.populate("coAuthors")
			.populate("submittedBy")
			.populate("reviewers")
			.lean()
			.exec();

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
		const effectiveHubRoles = await resolveEffectiveHubRoles(hubData);
		const currentUserHubMember = getEffectiveHubMemberForUser(effectiveHubRoles, locals.user);
		const assignmentAuthorization = await authorize(locals.user, 'paper.assignReviewers', {
			hub: hubData
		});
		const canManageEditorialFlow = assignmentAuthorization.allowed;
		const canReviewHub = currentUserHubMember?.canReview === true;
		const usersData = await fetchUsers();
		const papersData = await fetchPapers(canManageEditorialFlow || canReviewHub);
		const hubId = getIdAliases(hubData)[0] || params.id;
		const roleManagementAuthorization = await authorize(locals.user, 'hub.manageRoles', {
			hub: hubData
		});
		const memberRoleAssignments = await UserRoleAssignment.find({
			scopeType: 'hub',
			scopeId: hubId,
			isActive: true
		})
			.select('id _id userId roleKey scopeType scopeId isActive')
			.lean();
		const memberRoleDefinitions = await Role.find({
			scopeType: 'hub',
			scopeId: hubId,
			isActive: true
		})
			.select('key name priority')
			.lean();
		
		
		// Buscar ReviewAssignments para este hub (apenas para manager do hub)
		const isCreator = currentUserHubMember?.primaryRoleKey === 'HubOwner';
		const isViceManager = currentUserHubMember?.primaryRoleKey === 'EditorChief';
		const isHubManager = canManageEditorialFlow;
		let reviewAssignments: any[] = [];
		let pendingPaperInvitations: Array<{ paperId: string; reviewerId: string }> = [];
		
		
		if (isHubManager) {
			const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;
			const assignmentsRaw = await ReviewAssignment.find({ 
				hubId: params.id,
				status: { $in: ['accepted', 'pending'] }
			})
				.populate('reviewerId')
				.lean()
				.exec();
			
			
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
		}

		// Buscar convites pendentes para o usuário neste hub
		let hubInvitations = [];
		let paperReviewInvitations = [];
		
		
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
		

		return {
			hub: hubData,
			users: usersData,
			papers: papersData,
			isCreator,
			isViceManager,
			isHubManager,
			isHubReviewer: currentUserHubMember?.canReview === true,
			canManageRoles: roleManagementAuthorization.allowed,
			currentUserHubMember,
			effectiveHubMembers: effectiveHubRoles.members,
			effectiveReviewers: effectiveHubRoles.reviewers,
			memberRoleAssignments: memberRoleAssignments.map((assignment: any) => ({
				id: String(assignment.id || ''),
				_id: String(assignment._id || ''),
				userId: String(assignment.userId || ''),
				roleKey: String(assignment.roleKey || ''),
				scopeType: assignment.scopeType,
				scopeId: assignment.scopeId ? String(assignment.scopeId) : null,
				isActive: assignment.isActive !== false
			})),
			memberRoleDefinitions: memberRoleDefinitions.map((role: any) => ({
				key: String(role.key || ''),
				name: String(role.name || role.key || ''),
				priority: typeof role.priority === 'number' ? role.priority : null
			})),
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
