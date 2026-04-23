import crypto from 'crypto';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import Hubs from '$lib/db/models/Hub';
import { MAX_ACTIVE_REVIEW_ASSIGNMENTS } from '$lib/constants/reviewerLimits';
import { checkReviewerEligibility } from '$lib/helpers/reviewerEligibility';
import { canManageHub } from '$lib/helpers/hubPermissions';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { NotificationService } from '$lib/services/NotificationService';
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
			.populate('invitedBy')
			.populate('reviewer');

		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
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
		const invitedBy =
			typeof invitation.invitedBy === 'object'
				? invitation.invitedBy
				: await Users.findOne({ id: invitation.invitedBy });

		if (action === 'accept') {
			let paymentCaptured = false;
			let capturedPaymentIntentId: string | null = null;

			const hubReviewerIds: string[] = [];
			const isHubPaper = !!invitation.hubId && !!paper.hubId;

			if (isHubPaper) {
				try {
					const hubDoc = await Hubs.findById(String(invitation.hubId)).lean();
					if (hubDoc?.reviewers && Array.isArray(hubDoc.reviewers)) {
						hubReviewerIds.push(...hubDoc.reviewers.map((r: any) => String(r)));
					}
				} catch (e) {
					console.error('Failed to load hub reviewers during invitation acceptance:', e);
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
				hubReviewerIds,
				alreadyAssignedIds,
				activeAssignmentsCount,
				maxActiveAssignments: MAX_ACTIVE_REVIEW_ASSIGNMENTS,
				requireExpertiseMatch: false
			});

			console.log('Reviewer Eligibility Check:', {
				reviewerId: actingReviewerId,
				eligible: eligibility.eligible,
				reasons: eligibility.reasons,
				isHubPaper,
				hubReviewerIds,
				alreadyAssignedIds,
				activeAssignmentsCount,
				reviewerRoles: user.roles
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

			invitation.status = 'accepted';
			invitation.respondedAt = new Date();
			await invitation.save();

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
				(slot) => slot.status === 'available' || slot.status === 'declined'
			);

			if (!availableSlot) {
				return json(
					{
						error: 'No available review slots. All 3 reviewer slots are already occupied.',
						slotsOccupied: paper.reviewSlots.filter((s) => s.status === 'occupied').length,
						maxSlots: paper.maxReviewSlots || 3
					},
					{ status: 400 }
				);
			}

			availableSlot.reviewerId = actingReviewerId;
			availableSlot.status = 'occupied';
			availableSlot.acceptedAt = new Date();

			paper.availableSlots = paper.reviewSlots.filter(
				(slot) => slot.status === 'available' || slot.status === 'declined'
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

			const paperDoc = await Papers.findOne({ id: typeof paper === 'object' ? paper.id : paper });
			if (paperDoc) {
				console.log('Paper found:', paperDoc.id, 'Status:', paperDoc.status);
				console.log('Adding reviewer:', actingReviewerId);

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

				if (acceptedCount >= REQUIRED_REVIEWERS && paperDoc.status === 'reviewer assignment') {
					paperDoc.status = 'in review';
					paperDoc.peer_review.reviewStatus = 'in_progress';
				}

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
							console.log(
								`Payment captured after ${REQUIRED_REVIEWERS} reviewer acceptances:`,
								paymentIntent.id
							);
						} catch (captureError) {
							console.error('Failed to capture payment after 3 acceptances:', captureError);
						}
					} else {
						console.error('STRIPE_SECRET_KEY not configured. Could not capture payment.');
					}
				}

				await paperDoc.save();
				console.log('Reviewer added successfully. Paper status:', paperDoc.status);
			} else {
				console.error('Paper not found for ID:', typeof paper === 'object' ? paper.id : paper);
			}

			if (invitedBy) {
				const notificationData: any = {
					user: String(invitedBy._id || invitedBy.id),
					type: 'reviewer_accepted_review',
					title: 'Reviewer Accepted Paper Review',
					content: `${user.firstName} ${user.lastName} accepted the invitation to review "${paper?.title}"`,
					relatedPaperId: typeof paper === 'object' ? paper.id : paper,
					actionUrl: `/notifications`,
					priority: 'medium',
					metadata: {
						reviewerName: `${user.firstName} ${user.lastName}`,
						reviewerId: actingReviewerId,
						paperTitle: paper?.title
					}
				};

				if (invitation.hubId && paper.hubId) {
					notificationData.relatedHubId = String(invitation.hubId);
				}

				await NotificationService.createNotification(notificationData);
			}

			if (paymentCaptured) {
				const paperId = typeof paper === 'object' ? paper.id : String(paper);
				const paperTitle = paper?.title || 'your paper';
				const amountInBrl = paper?.paymentHold?.amount
					? `R$${(Number(paper.paymentHold.amount) / 100).toFixed(2)} BRL`
					: 'the authorized amount';
				const authorId =
					typeof paper?.submittedBy === 'object'
						? String((paper.submittedBy as any)?._id || (paper.submittedBy as any)?.id)
						: paper?.submittedBy
							? String(paper.submittedBy)
							: null;
				const editorId = invitedBy ? String(invitedBy._id || invitedBy.id) : null;

				if (authorId) {
					await NotificationService.createNotification({
						user: authorId,
						type: 'system',
						title: 'Payment Captured',
						content: `Payment for "${paperTitle}" was captured after ${REQUIRED_REVIEWERS} reviewers accepted. Amount: ${amountInBrl}.`,
						relatedPaperId: paperId,
						actionUrl: `/notifications`,
						priority: 'high',
						metadata: {
							paymentIntentId: capturedPaymentIntentId,
							reviewersAccepted: REQUIRED_REVIEWERS,
							amount: paper?.paymentHold?.amount,
							currency: paper?.paymentHold?.currency
						}
					});
				}

				if (editorId && editorId !== authorId) {
					await NotificationService.createNotification({
						user: editorId,
						type: 'system',
						title: 'Payment Captured After 3 Acceptances',
						content: `Payment for "${paperTitle}" has been captured after all ${REQUIRED_REVIEWERS} reviewers accepted. Amount: ${amountInBrl}.`,
						relatedPaperId: paperId,
						actionUrl: `/notifications`,
						priority: 'high',
						metadata: {
							paymentIntentId: capturedPaymentIntentId,
							reviewersAccepted: REQUIRED_REVIEWERS,
							amount: paper?.paymentHold?.amount,
							currency: paper?.paymentHold?.currency
						}
					});
				}
			}
		} else {
			invitation.status = 'declined';
			invitation.respondedAt = new Date();
			await invitation.save();

			const reviewerSlot = paper.reviewSlots?.find(
				(slot) => slot.reviewerId?.toString() === actingReviewerId && slot.status === 'pending'
			);

			if (reviewerSlot) {
				reviewerSlot.status = 'declined';
				reviewerSlot.declinedAt = new Date();
				reviewerSlot.reviewerId = null;

				paper.availableSlots = paper.reviewSlots.filter(
					(slot) => slot.status === 'available' || slot.status === 'declined'
				).length;

				await paper.save();
			}

			if (invitedBy) {
				await NotificationService.createNotification({
					user: String(invitedBy._id || invitedBy.id),
					type: 'reviewer_declined_review',
					title: 'Reviewer Declined Paper Review',
					content: `${user.firstName} ${user.lastName} declined the invitation to review "${paper?.title}"`,
					relatedPaperId: typeof paper === 'object' ? paper.id : paper,
					relatedHubId: String(invitation.hubId),
					actionUrl: `/paper/${typeof paper === 'object' ? paper.id : paper}`,
					priority: 'low',
					metadata: {
						reviewerName: `${user.firstName} ${user.lastName}`,
						reviewerId: actingReviewerId,
						paperTitle: paper?.title
					}
				});
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
			.populate('invitedBy')
			.populate('hubId');

		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		if (!canManageHub(invitation.hubId as any, user.id)) {
			return json({ error: 'Only hub managers can cancel invitations' }, { status: 403 });
		}

		await PaperReviewInvitation.deleteOne({ _id: inviteId });

		const { canonicalId: canonicalInvitationReviewerId } = await resolveUserIdentifiers(
			invitation.reviewer as any
		);
		const reviewerId =
			canonicalInvitationReviewerId ||
			(typeof invitation.reviewer === 'object'
				? String((invitation.reviewer as any)._id || (invitation.reviewer as any).id || '')
				: String(invitation.reviewer || ''));
		const paper = typeof invitation.paper === 'object' ? invitation.paper : null;

		if (reviewerId) {
			await NotificationService.createNotification({
				user: reviewerId,
				type: 'invitation_cancelled',
				title: 'Review Invitation Cancelled',
				content: `Your invitation to review "${paper?.title || 'a paper'}" has been cancelled.`,
				relatedPaperId: paper?.id,
				relatedHubId: String(invitation.hubId),
				actionUrl: `/notifications`,
				priority: 'low',
				metadata: {
					paperTitle: paper?.title,
					paperId: paper?.id
				}
			});
		}

		return json({
			success: true,
			message: 'Invitation cancelled successfully'
		});
	} catch (error) {
		console.error('Error cancelling paper review invitation:', error);
		return json({ error: 'Failed to cancel invitation' }, { status: 500 });
	}
};
