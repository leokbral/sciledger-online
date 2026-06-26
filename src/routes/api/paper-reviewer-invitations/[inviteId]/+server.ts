import crypto from 'crypto';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import { MAX_ACTIVE_REVIEW_ASSIGNMENTS } from '$lib/constants/reviewerLimits';
import { checkReviewerEligibility } from '$lib/helpers/reviewerEligibility';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { emitEvent } from '$lib/services/EventService';
import { authorize } from '$lib/server/authorization/authorizationService';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';
import { emitPaperReviewInvitationEvent } from '$lib/server/reviewInvitationLifecycle';
import {
	getInvitationInviterId,
	getInvitationInviterRole,
	getInvitationPaperId,
	getReviewInvitationExpiresAt
} from '$lib/server/reviewInvitations';
import {
	REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
	validateReviewerCanReviewPaper
} from '$lib/server/reviewConflictOfInterest';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

const REQUIRED_REVIEWERS = 3;

function getStripe() {
	const stripeSecretKey = env.STRIPE_SECRET_KEY;
	if (!stripeSecretKey) {
		return null;
	}
	return new Stripe(stripeSecretKey);
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { inviteId } = params;
		const { action } = await request.json();

		if (!action || !['accept', 'decline'].includes(action)) {
			return json({ error: 'Invalid action' }, { status: 400 });
		}

		const invitation = await PaperReviewInvitation.findOne({
			$or: [{ _id: inviteId }, { id: inviteId }]
		})
			.populate('paper')
			.populate('reviewer');

		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		if (invitation.status !== 'pending') {
			return json({ error: 'Invitation already processed' }, { status: 400 });
		}

		const now = new Date();
		if (getReviewInvitationExpiresAt(invitation, now) <= now) {
			return json({ error: 'Invitation expired' }, { status: 400 });
		}

		const { canonicalId: canonicalReviewerId, aliases: invitationReviewerAliases } =
			await resolveUserIdentifiers(invitation.reviewer as any);
		const currentUserAliases = [String(user.id), String(user._id || '')].filter(Boolean);

		if (!currentUserAliases.some((alias) => invitationReviewerAliases.includes(alias))) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const actingReviewerId = canonicalReviewerId || String(user.id);

		const paper =
			typeof invitation.paper === 'object'
				? invitation.paper
				: await Papers.findOne({ id: invitation.paper });
		const inviterId = getInvitationInviterId(invitation);
		const invitedBy = inviterId
			? await Users.findOne({ $or: [{ id: inviterId }, { _id: inviterId }] })
			: null;

		invitation.paperId = invitation.paperId || getInvitationPaperId(invitation);
		invitation.reviewerId = invitation.reviewerId || actingReviewerId;
		invitation.invitedBy = {
			userId: inviterId || actingReviewerId,
			role: getInvitationInviterRole(invitation)
		};

		if (action === 'accept') {
			const conflictValidation = validateReviewerCanReviewPaper(paper as any, user);
			if (!conflictValidation.allowed) {
				return json({ error: REVIEW_CONFLICT_OF_INTEREST_MESSAGE }, { status: 403 });
			}

			let paymentCaptured = false;
			let capturedPaymentIntentId: string | null = null;
			let capturedPaymentAmount: number | null = null;
			let capturedPaymentCurrency: string | null = null;

			let effectiveReviewerIds: string[] = [];
			const isHubPaper = !!invitation.hubId && !!paper.hubId;

			if (isHubPaper) {
				try {
					const effectiveRoles = await resolveEffectiveHubRoles(String(invitation.hubId));
					effectiveReviewerIds = effectiveRoles.reviewerIds;
				} catch (e) {
					console.error(
						'Failed to resolve effective hub reviewers during invitation acceptance:',
						e
					);
				}
			}

			const alreadyAssignedIds: string[] = (paper.peer_review?.assignedReviewers || []).map(
				(r: any) => String(r)
			);
			const activeAssignmentsCount =
				typeof MAX_ACTIVE_REVIEW_ASSIGNMENTS === 'number'
					? await ReviewAssignment.countDocuments({
							reviewerId: actingReviewerId,
							status: { $in: ['accepted', 'pending'] }
						})
					: 0;

			const eligibility = checkReviewerEligibility(paper as any, user as any, {
				hubReviewerIds: effectiveReviewerIds,
				alreadyAssignedIds,
				activeAssignmentsCount,
				maxActiveAssignments: MAX_ACTIVE_REVIEW_ASSIGNMENTS,
				requireExpertiseMatch: false
			});

			const hardStopReasons = (eligibility.reasons || []).filter(
				(reason: string) =>
					reason.includes('Conflict of interest') || reason.includes('already assigned')
			);

			if (hardStopReasons.length > 0) {
				return json(
					{
						error: 'Not eligible to accept this review',
						reasons: hardStopReasons
					},
					{ status: 403 }
				);
			}

			if (!paper.reviewSlots || paper.reviewSlots.length === 0) {
				paper.reviewSlots = [
					{ slotNumber: 1, reviewerId: null, status: 'available' },
					{ slotNumber: 2, reviewerId: null, status: 'available' },
					{ slotNumber: 3, reviewerId: null, status: 'available' }
				];
				paper.maxReviewSlots = 3;
				paper.availableSlots = 3;
			}

			const availableSlot = paper.reviewSlots.find(
				(slot: any) => slot.status === 'available' || slot.status === 'declined'
			);

			if (!availableSlot) {
				return json(
					{
						error: 'No available review slots. All 3 reviewer slots are already occupied.',
						slotsOccupied: paper.reviewSlots.filter((s: any) => s.status === 'occupied').length,
						maxSlots: paper.maxReviewSlots || 3
					},
					{ status: 400 }
				);
			}

			invitation.status = 'accepted';
			invitation.respondedAt = new Date();
			await invitation.save();

			availableSlot.reviewerId = actingReviewerId;
			availableSlot.status = 'occupied';
			availableSlot.acceptedAt = new Date();

			paper.availableSlots = paper.reviewSlots.filter(
				(slot: any) => slot.status === 'available' || slot.status === 'declined'
			).length;
			await paper.save();

			const queueId = crypto.randomUUID();
			const reviewQueueEntry = new ReviewQueue({
				_id: queueId,
				id: queueId,
				paperId: typeof paper === 'object' ? paper.id : paper,
				reviewer: actingReviewerId,
				peerReviewType: 'selected',
				hubId: invitation.hubId,
				isLinkedToHub: !!invitation.hubId && !!paper.hubId,
				status: 'accepted',
				assignedAt: new Date()
			});
			await reviewQueueEntry.save();

			const deadlineDays = invitation.customDeadlineDays || 15;
			const acceptedAt = new Date();
			const deadline = new Date(acceptedAt.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

			const assignmentId = crypto.randomUUID();
			const reviewAssignment = new ReviewAssignment({
				_id: assignmentId,
				id: assignmentId,
				paperId: typeof paper === 'object' ? paper.id : paper,
				reviewerId: actingReviewerId,
				status: 'accepted',
				assignedAt: new Date(),
				acceptedAt,
				deadline,
				hubId: invitation.hubId,
				isLinkedToHub: !!invitation.hubId && !!paper.hubId
			});
			await reviewAssignment.save();

			invitation.reviewAssignmentId = assignmentId;
			await invitation.save();
			await emitPaperReviewInvitationEvent('review.invitation.accepted', invitation, {
				actorId: actingReviewerId,
				metadata: {
					reviewAssignmentId: assignmentId
				}
			});

			const paperDoc = await Papers.findOne({ id: typeof paper === 'object' ? paper.id : paper });
			if (paperDoc) {
				if (!paperDoc.reviewers) {
					paperDoc.reviewers = [];
				}
				if (!paperDoc.reviewers.includes(actingReviewerId)) {
					paperDoc.reviewers.push(actingReviewerId);
				}

				if (!paperDoc.peer_review) {
					paperDoc.peer_review = {
						reviewType: 'selected',
						responses: [],
						reviews: [],
						assignedReviewers: [],
						averageScore: 0,
						reviewCount: 0,
						reviewStatus: 'not_started'
					};
				}

				const existingResponse = paperDoc.peer_review.responses.find(
					(r: any) => r.reviewerId === actingReviewerId
				);

				if (!existingResponse) {
					paperDoc.peer_review.responses.push({
						reviewerId: actingReviewerId,
						status: 'accepted',
						responseDate: new Date(),
						assignedAt: new Date()
					});
				} else {
					existingResponse.status = 'accepted';
					existingResponse.responseDate = new Date();
					existingResponse.assignedAt = new Date();
				}

				if (
					!paperDoc.peer_review.assignedReviewers.some((r: any) => String(r) === actingReviewerId)
				) {
					paperDoc.peer_review.assignedReviewers.push(actingReviewerId);
				}

				const acceptedCount = paperDoc.peer_review.responses.filter(
					(r: any) => r.status === 'accepted' || r.status === 'completed'
				).length;

				const shouldSendToReview =
					acceptedCount >= REQUIRED_REVIEWERS && paperDoc.status === 'reviewer assignment';

				if (
					acceptedCount >= REQUIRED_REVIEWERS &&
					paperDoc.paymentHold?.stripePaymentIntentId &&
					paperDoc.paymentHold?.status === 'authorized'
				) {
					const stripe = getStripe();
					if (stripe) {
						try {
							const paymentIntent = await stripe.paymentIntents.capture(
								paperDoc.paymentHold.stripePaymentIntentId
							);
							paperDoc.paymentHold.status = 'captured';
							paperDoc.paymentHold.capturedAt = new Date();
							paperDoc.paymentHold.receiptUrl = null;
							paymentCaptured = true;
							capturedPaymentIntentId = paymentIntent.id;
							capturedPaymentAmount = paymentIntent.amount;
							capturedPaymentCurrency = paymentIntent.currency;
						} catch (captureError) {
							console.error('Failed to capture payment after 3 acceptances:', captureError);
						}
					} else {
						console.error('STRIPE_SECRET_KEY not configured. Could not capture payment.');
					}
				}

				await paperDoc.save();

				if (shouldSendToReview) {
					try {
						await transitionPaperStatus({
							paperId: String(paperDoc.id),
							action: 'paper.sendToReview',
							expectedStatus: 'reviewer assignment',
							system: true,
							metadata: {
								endpoint: '/api/paper-reviewer-invitations/[inviteId]',
								trigger: 'required_reviewers_accepted',
								requiredReviewers: REQUIRED_REVIEWERS
							}
						});
					} catch (transitionError) {
						if (transitionError instanceof EditorialTransitionError) {
							console.warn(
								'Reviewer invitation status transition skipped:',
								transitionError.message
							);
						} else {
							throw transitionError;
						}
					}
				}
			} else {
				console.error('Paper not found for ID:', typeof paper === 'object' ? paper.id : paper);
			}

			if (paymentCaptured) {
				const paperId = typeof paper === 'object' ? paper.id : String(paper);
				const paperTitle = paper?.title || 'your paper';
				const authorId =
					typeof paper?.submittedBy === 'object'
						? String((paper.submittedBy as any)?._id || (paper.submittedBy as any)?.id)
						: paper?.submittedBy
							? String(paper.submittedBy)
							: null;
				const editorId = invitedBy ? String(invitedBy._id || invitedBy.id) : null;
				const recipients = [...new Set([authorId, editorId].filter(Boolean).map(String))];

				if (recipients.length > 0) {
					try {
						await emitEvent({
							type: 'payment.hold.captured',
							actorId: null,
							recipients,
							entityType: 'paper',
							entityId: paperId,
							metadata: {
								paperId,
								paperTitle,
								amount: capturedPaymentAmount ?? paper?.paymentHold?.amount,
								currency: capturedPaymentCurrency ?? paper?.paymentHold?.currency ?? 'brl',
								paymentStatus: 'captured',
								stripePaymentIntentId: capturedPaymentIntentId,
								reviewersAccepted: REQUIRED_REVIEWERS,
								trigger: 'required_reviewers_accepted',
								recipientRoles: Object.fromEntries(
									recipients.map((recipientId) => [
										recipientId,
										recipientId === authorId ? 'author' : 'editor'
									])
								)
							}
						});
					} catch (eventError) {
						console.error('Failed to emit payment hold captured event:', eventError);
					}
				}
			}
		} else {
			invitation.status = 'declined';
			invitation.respondedAt = new Date();
			await invitation.save();
			await emitPaperReviewInvitationEvent('review.invitation.declined', invitation, {
				actorId: actingReviewerId
			});

			const reviewerSlot = paper.reviewSlots?.find(
				(slot: any) => slot.reviewerId?.toString() === actingReviewerId && slot.status === 'pending'
			);

			if (reviewerSlot) {
				reviewerSlot.status = 'declined';
				reviewerSlot.declinedAt = new Date();
				reviewerSlot.reviewerId = null;

				paper.availableSlots = paper.reviewSlots.filter(
					(slot: any) => slot.status === 'available' || slot.status === 'declined'
				).length;

				await paper.save();
			}
		}

		return json({
			success: true,
			action,
			message:
				action === 'accept'
					? 'You accepted the review invitation. The paper is now available for you to review.'
					: 'You declined the review invitation.'
		});
	} catch (error) {
		console.error('Error responding to paper review invitation:', error);
		return json({ error: 'Failed to process invitation response' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { inviteId } = params;

		const invitation = await PaperReviewInvitation.findOne({
			$or: [{ _id: inviteId }, { id: inviteId }]
		})
			.populate('paper')
			.populate('hubId');

		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		const paper = typeof invitation.paper === 'object' ? invitation.paper : null;
		const authorization = await authorize(user, 'paper.assignReviewers', {
			paper: paper ?? undefined,
			hubId: String(invitation.hubId || '')
		});
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}

		if (invitation.status !== 'pending') {
			return json({ error: 'Only pending invitations can be cancelled' }, { status: 400 });
		}

		invitation.status = 'cancelled';
		invitation.cancelledAt = new Date();
		invitation.updatedAt = new Date();
		await invitation.save();

		await emitPaperReviewInvitationEvent('review.invitation.cancelled', invitation, {
			actorId: user.id
		});

		return json({
			success: true,
			message: 'Invitation cancelled successfully'
		});
	} catch (error) {
		console.error('Error cancelling paper review invitation:', error);
		return json({ error: 'Failed to cancel invitation' }, { status: 500 });
	}
};
