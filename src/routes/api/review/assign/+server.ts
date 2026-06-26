import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Users from '$lib/db/models/User';
import { authorize } from '$lib/server/authorization/authorizationService';
import { emitPaperReviewInvitationEvent } from '$lib/server/reviewInvitationLifecycle';
import {
	buildDuplicateInvitationDetails,
	findActiveReviewInvitation,
	getIdAliases,
	getNewReviewInvitationExpiresAt,
	savePendingReviewInvitationOrFindExisting,
	selectInvitationRole
} from '$lib/server/reviewInvitations';
import {
	REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
	validateReviewerCanReviewPaper
} from '$lib/server/reviewConflictOfInterest';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, reviewerIds, reviewerId, peerReviewType } = await request.json();
		const normalizedReviewerIds: string[] = Array.isArray(reviewerIds)
			? reviewerIds.filter(Boolean).map((id: string) => String(id))
			: reviewerId
				? [String(reviewerId)]
				: [];

		if (!paperId || normalizedReviewerIds.length === 0) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		const paper = await Papers.findOne({ $or: [{ id: paperId }, { _id: paperId }] });
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
		const normalizedPaperId = String(paper.id || paper._id);
		const paperAliases = [
			...new Set([String(paperId), normalizedPaperId, String(paper._id || '')].filter(Boolean))
		];

		if (!paper.peer_review) {
			paper.peer_review = {
				reviewType: peerReviewType || 'selected',
				responses: [],
				reviews: [],
				assignedReviewers: [],
				averageScore: 0,
				reviewCount: 0,
				reviewStatus: 'not_started'
			};
		} else {
			paper.peer_review.reviewType = peerReviewType || paper.peer_review.reviewType;
		}

		const invitations = [];
		const skipped = [];
		const duplicates = [];

		for (const rawReviewerId of normalizedReviewerIds) {
			const reviewer = await Users.findOne({
				$or: [{ id: rawReviewerId }, { _id: rawReviewerId }]
			});
			if (!reviewer) {
				console.warn(`Reviewer ${rawReviewerId} not found`);
				skipped.push({ reviewerId: rawReviewerId, reasons: ['Reviewer not found'] });
				continue;
			}

			const normalizedReviewerId = String(reviewer.id || reviewer._id);
			const reviewerAliases = [
				...new Set([rawReviewerId, normalizedReviewerId, ...getIdAliases(reviewer)].filter(Boolean))
			];
			const conflictValidation = validateReviewerCanReviewPaper(paper as any, reviewer as any);

			if (!conflictValidation.allowed) {
				skipped.push({
					reviewerId: rawReviewerId,
					reasons: [REVIEW_CONFLICT_OF_INTEREST_MESSAGE]
				});
				continue;
			}

			const existingInvite = await findActiveReviewInvitation(paperAliases, reviewerAliases);

			if (existingInvite) {
				const duplicateId = randomUUID();
				const duplicateInvitation = new PaperReviewInvitation({
					_id: duplicateId,
					id: duplicateId,
					paperId: normalizedPaperId,
					paper: normalizedPaperId,
					reviewerId: normalizedReviewerId,
					reviewer: normalizedReviewerId,
					invitedBy: {
						userId: user.id,
						role: invitedByRole
					},
					status: 'duplicate',
					duplicateOf: String(existingInvite.id || existingInvite._id),
					invitedAt: new Date(),
					createdAt: new Date(),
					hubId: paper.hubId || null
				});
				await duplicateInvitation.save();
				await emitPaperReviewInvitationEvent('review.invitation.duplicate', duplicateInvitation, {
					actorId: user.id,
					metadata: {
						duplicateOf: String(existingInvite.id || existingInvite._id)
					}
				});

				const duplicateDetails = await buildDuplicateInvitationDetails(existingInvite);
				duplicates.push(duplicateDetails);
				skipped.push({
					reviewerId: rawReviewerId,
					reasons: ['Reviewer already invited for this paper'],
					existingInvitation: duplicateDetails
				});
				continue;
			}

			const invitationId = randomUUID();
			const invitedAt = new Date();
			const invitation = new PaperReviewInvitation({
				_id: invitationId,
				id: invitationId,
				paperId: normalizedPaperId,
				paper: normalizedPaperId,
				reviewerId: normalizedReviewerId,
				reviewer: normalizedReviewerId,
				invitedBy: {
					userId: user.id,
					role: invitedByRole
				},
				status: 'pending',
				resendCount: 0,
				invitedAt,
				expiresAt: getNewReviewInvitationExpiresAt(invitedAt),
				createdAt: invitedAt,
				updatedAt: invitedAt,
				hubId: paper.hubId || null
			});

			const saveResult = await savePendingReviewInvitationOrFindExisting(
				invitation,
				paperAliases,
				reviewerAliases
			);
			if (!saveResult.created) {
				const existingInvite = saveResult.invitation;
				const duplicateId = randomUUID();
				const duplicateInvitation = new PaperReviewInvitation({
					_id: duplicateId,
					id: duplicateId,
					paperId: normalizedPaperId,
					paper: normalizedPaperId,
					reviewerId: normalizedReviewerId,
					reviewer: normalizedReviewerId,
					invitedBy: {
						userId: user.id,
						role: invitedByRole
					},
					status: 'duplicate',
					duplicateOf: String(existingInvite.id || existingInvite._id),
					invitedAt: new Date(),
					createdAt: new Date(),
					hubId: paper.hubId || null
				});
				await duplicateInvitation.save();
				await emitPaperReviewInvitationEvent('review.invitation.duplicate', duplicateInvitation, {
					actorId: user.id,
					metadata: {
						duplicateOf: String(existingInvite.id || existingInvite._id),
						source: 'unique_pending_index'
					}
				});

				const duplicateDetails = await buildDuplicateInvitationDetails(existingInvite);
				duplicates.push(duplicateDetails);
				skipped.push({
					reviewerId: rawReviewerId,
					reasons: ['Reviewer already invited for this paper'],
					existingInvitation: duplicateDetails
				});
				continue;
			}

			invitations.push(saveResult.invitation);

			await emitPaperReviewInvitationEvent('review.invitation.created', saveResult.invitation, {
				actorId: user.id,
				metadata: {
					source: 'api.review.assign'
				}
			});
		}

		paper.updatedAt = new Date();
		await paper.save();

		const conflictOnly =
			invitations.length === 0 &&
			skipped.length > 0 &&
			skipped.every((item: any) =>
				(item.reasons || []).includes(REVIEW_CONFLICT_OF_INTEREST_MESSAGE)
			);

		return json(
			{
				success: invitations.length > 0,
				message:
					invitations.length > 0
						? `Successfully sent ${invitations.length} invitation(s)`
						: conflictOnly
							? REVIEW_CONFLICT_OF_INTEREST_MESSAGE
							: 'Reviewer already invited for this paper',
				error: conflictOnly ? REVIEW_CONFLICT_OF_INTEREST_MESSAGE : undefined,
				invitations: invitations.length,
				skipped,
				duplicates
			},
			conflictOnly ? { status: 403 } : undefined
		);
	} catch (error) {
		console.error('Error assigning reviewers:', error);
		return json(
			{ error: 'Failed to assign reviewers', details: (error as Error).message, success: false },
			{ status: 500 }
		);
	}
};
