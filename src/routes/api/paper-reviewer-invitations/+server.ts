import crypto from 'crypto';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import { MAX_ACTIVE_REVIEW_ASSIGNMENTS } from '$lib/constants/reviewerLimits';
import { checkReviewerEligibility } from '$lib/helpers/reviewerEligibility';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { NotificationService } from '$lib/services/NotificationService';
import { authorize } from '$lib/server/authorization/authorizationService';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';
import {
	buildDuplicateInvitationDetails,
	findActiveReviewInvitation,
	getIdAliases,
	selectInvitationRole
} from '$lib/server/reviewInvitations';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, hubId, reviewerIds, customDeadlineDays } = await request.json();

		if (!paperId || !hubId || !reviewerIds || !Array.isArray(reviewerIds)) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		const deadlineDays = customDeadlineDays && customDeadlineDays > 0 ? customDeadlineDays : 15;

		const paper = await Papers.findOne({ id: paperId }).populate('hubId');
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const isStandalonePaper = !paper.hubId;
		const hasAuthorizedPaymentHold =
			!!paper.paymentHold?.stripePaymentIntentId &&
			(paper.paymentHold?.status === 'authorized' || paper.paymentHold?.status === 'captured');

		if (isStandalonePaper && !hasAuthorizedPaymentHold) {
			return json(
				{
					error:
						'Payment authorization is required before inviting reviewers for standalone papers.'
				},
				{ status: 403 }
			);
		}

		const authorization = await authorize(user, 'paper.assignReviewers', { paper });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}
		const invitedByRole = selectInvitationRole(authorization.roleKeys);
		const paperAliases = [...new Set([String(paperId), ...getIdAliases(paper)].filter(Boolean))];

		if (!paper.reviewSlots || paper.reviewSlots.length === 0) {
			paper.reviewSlots = [
				{ slotNumber: 1, reviewerId: null, status: 'available' },
				{ slotNumber: 2, reviewerId: null, status: 'available' },
				{ slotNumber: 3, reviewerId: null, status: 'available' }
			];
			paper.maxReviewSlots = 3;
			paper.availableSlots = 3;
			await paper.save();
		}

		const availableSlotsList = paper.reviewSlots.filter(
			(slot: any) => slot.status === 'available' || slot.status === 'declined'
		);
		const availableSlotsCount = availableSlotsList.length;

		let effectiveReviewerIds: string[] = [];
		try {
			const effectiveRoles = await resolveEffectiveHubRoles(
				typeof paper.hubId === 'object' ? paper.hubId : hubId
			);
			effectiveReviewerIds = effectiveRoles.reviewerIds;
		} catch (e) {
			console.error('Failed to resolve effective hub reviewers for invitation eligibility:', e);
		}

		const alreadyAssignedIds: string[] = (paper.peer_review?.assignedReviewers || []).map(
			(r: any) => String(r)
		);

		const invitations = [] as any[];
		const skipped = [] as {
			reviewerId: string;
			reasons: string[];
			existingInvitation?: Awaited<ReturnType<typeof buildDuplicateInvitationDetails>>;
		}[];
		const duplicates = [] as Awaited<ReturnType<typeof buildDuplicateInvitationDetails>>[];

		for (const reviewerId of reviewerIds) {
			const reviewer = await Users.findOne({ $or: [{ id: reviewerId }, { _id: reviewerId }] });
			if (!reviewer) {
				skipped.push({ reviewerId: String(reviewerId), reasons: ['Reviewer not found'] });
				continue;
			}

			const { canonicalId, aliases } = await resolveUserIdentifiers({
				id: String((reviewer as any).id || ''),
				_id: String((reviewer as any)._id || '')
			});
			const normalizedReviewerId = canonicalId || String(reviewerId);
			const reviewerIdAliases = aliases.length > 0 ? aliases : [normalizedReviewerId];

			const activeAssignmentsCount =
				typeof MAX_ACTIVE_REVIEW_ASSIGNMENTS === 'number'
					? await ReviewAssignment.countDocuments({
							reviewerId: normalizedReviewerId,
							status: { $in: ['accepted', 'pending'] }
						})
					: 0;

			const eligibility = checkReviewerEligibility(paper as any, reviewer as any, {
				hubReviewerIds: effectiveReviewerIds,
				alreadyAssignedIds,
				activeAssignmentsCount,
				maxActiveAssignments: MAX_ACTIVE_REVIEW_ASSIGNMENTS,
				requireExpertiseMatch: false
			});

			if (!eligibility.eligible) {
				skipped.push({ reviewerId: String(reviewerId), reasons: eligibility.reasons });
				continue;
			}

			const existingInvite = await findActiveReviewInvitation(paperAliases, reviewerIdAliases);

			if (existingInvite) {
				const duplicateId = crypto.randomUUID();
				const duplicateInvitation = new PaperReviewInvitation({
					_id: duplicateId,
					id: duplicateId,
					paperId,
					paper: paperId,
					reviewerId: normalizedReviewerId,
					reviewer: normalizedReviewerId,
					invitedBy: {
						userId: user.id,
						role: invitedByRole
					},
					hubId,
					status: 'duplicate',
					duplicateOf: String(existingInvite.id || existingInvite._id),
					customDeadlineDays: deadlineDays,
					invitedAt: new Date(),
					createdAt: new Date()
				});
				await duplicateInvitation.save();

				const duplicateDetails = await buildDuplicateInvitationDetails(existingInvite);
				duplicates.push(duplicateDetails);
				skipped.push({
					reviewerId: String(reviewerId),
					reasons: ['Reviewer already invited for this paper'],
					existingInvitation: duplicateDetails
				});
				continue;
			}

			const inviteId = crypto.randomUUID();
			const invitation = new PaperReviewInvitation({
				_id: inviteId,
				id: inviteId,
				paperId,
				paper: paperId,
				reviewerId: normalizedReviewerId,
				reviewer: normalizedReviewerId,
				invitedBy: {
					userId: user.id,
					role: invitedByRole
				},
				hubId,
				status: 'pending',
				customDeadlineDays: deadlineDays,
				invitedAt: new Date()
			});

			await invitation.save();
			invitations.push(invitation);

			await NotificationService.createNotification({
				user: normalizedReviewerId,
				type: 'review_request',
				title: 'New Paper Review Request',
				content: `You have been invited to review the paper "${paper.title}". ${availableSlotsCount} slot(s) available.`,
				relatedPaperId: paperId,
				relatedHubId: hubId,
				actionUrl: `/notifications?inviteId=${inviteId}`,
				priority: 'high',
				metadata: {
					paperId,
					paperTitle: paper.title,
					invitedBy: user.id,
					invitedByName: `${user.firstName} ${user.lastName}`,
					inviteId,
					inviteType: 'paper_review'
				}
			});
		}

		if (invitations.length === 0) {
			const duplicateOnly = duplicates.length > 0 && skipped.length === duplicates.length;
			return json({
				success: false,
				error: duplicateOnly
					? 'Reviewer already invited for this paper'
					: 'No reviewer invitations were created',
				invitations: 0,
				skipped,
				duplicates,
				message:
					duplicateOnly
						? 'Reviewer already invited for this paper'
						: 'No reviewer invitations were created. Check the skipped reasons and try again.',
				availableSlots: availableSlotsCount,
				maxSlots: paper.maxReviewSlots || 3
			});
		}

		return json({
			success: true,
			invitations: invitations.length,
			skipped,
			duplicates,
			message: `Invited ${invitations.length} reviewer(s). Skipped ${skipped.length} due to duplicates or ineligibility. The first 3 to accept will occupy the review slots.`,
			availableSlots: availableSlotsCount,
			maxSlots: paper.maxReviewSlots || 3
		});
	} catch (error) {
		console.error('Error creating paper review invitations:', error);
		return json({ error: 'Failed to create invitations' }, { status: 500 });
	}
};
