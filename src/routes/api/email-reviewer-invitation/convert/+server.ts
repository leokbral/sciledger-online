import { json } from '@sveltejs/kit';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { NotificationService } from '$lib/services/NotificationService';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { MAX_ACTIVE_REVIEW_ASSIGNMENTS } from '$lib/constants/reviewerLimits';
import { checkReviewerEligibility } from '$lib/helpers/reviewerEligibility';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';
import { assignHighestHubRole } from '$lib/server/authorization/roleAssignmentService';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';
import {
    EditorialTransitionError,
    transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

// Clear cache to ensure we get the updated schema
delete mongoose.models.EmailReviewerInvitation;

const EmailReviewerInvitation = mongoose.model('EmailReviewerInvitation', EmailReviewerInvitationSchema);

// Import models
let Invitation: any;
let Hub: any;

try {
    Invitation = mongoose.model('Invitation');
    Hub = mongoose.model('Hub');
} catch (error) {
    // Models will be loaded from existing connections
}

const REQUIRED_REVIEWERS = 3;

let transporter: nodemailer.Transporter | null = null;

function getStripe() {
    const stripeSecretKey = env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        return null;
    }
    return new Stripe(stripeSecretKey);
}

function getTransporter(): nodemailer.Transporter | null {
    if (transporter) return transporter;

    const smtpUser = env.SMTP_USER;
    const smtpPass = env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
        return null;
    }

    const smtpPort = Number(env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST || 'smtp.gmail.com',
        port: smtpPort,
        secure: env.SMTP_SECURE === 'true' || smtpPort === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    return transporter;
}

async function findUserByAnyId(userId: string | null | undefined) {
    if (!userId) return null;
    const id = String(userId);
    return Users.findOne({ $or: [{ _id: id }, { id }] }).lean();
}

async function notifyManagerInvitationAccepted(options: {
    managerId: string;
    managerEmail?: string | null;
    managerName?: string | null;
    reviewerId: string;
    reviewerName: string;
    hubId: string;
    hubName: string;
    paperId?: string | null;
}) {
    const { managerId, managerEmail, managerName, reviewerId, reviewerName, hubId, hubName, paperId } = options;

    await NotificationService.createNotification({
        user: managerId,
        type: 'hub_reviewer_accepted',
        title: 'Reviewer Accepted Email Invitation',
        content: `${reviewerName} accepted the email invitation to review for "${hubName}"`,
        relatedHubId: hubId,
        actionUrl: '/notifications',
        priority: 'medium',
        metadata: {
            reviewerName,
            reviewerId,
            hubName,
            paperId: paperId || null,
            source: 'email_reviewer_invitation'
        }
    });

    const smtpTransporter = getTransporter();
    if (!smtpTransporter || !managerEmail) {
        return;
    }

    await smtpTransporter.sendMail({
        from: `"SciLedger Team" <${env.SMTP_USER}>`,
        to: managerEmail,
        subject: `Reviewer accepted invitation - ${hubName}`,
        html: `
            <p>Hello ${managerName || 'Hub Manager'},</p>
            <p><strong>${reviewerName}</strong> accepted your reviewer invitation for the hub <strong>${hubName}</strong>.</p>
            ${paperId ? `<p>Paper reference: <strong>${paperId}</strong></p>` : ''}
            <p>You can view details in your SciLedger notifications.</p>
        `
    });
}

async function acceptPaperReviewInvite(options: {
    userId: string;
    inviterId: string | null;
    paperId: string;
    hubId: string;
    customDeadlineDays?: number | null;
}) {
    const { userId, inviterId, paperId, hubId, customDeadlineDays } = options;
    const paper = await Papers.findOne({ id: paperId }).populate('hubId');
    if (!paper) {
        return { ok: false, status: 404, error: 'Paper not found' };
    }

    const user = await Users.findOne({ $or: [{ id: userId }, { _id: userId }] }).lean();
    if (!user) {
        return { ok: false, status: 404, error: 'Reviewer not found' };
    }

    const hubDoc = await Hubs.findById(hubId).lean();
    if (!hubDoc) {
        return { ok: false, status: 404, error: 'Hub not found' };
    }

    let effectiveReviewerIds: string[] = [];
    try {
        const effectiveRoles = await resolveEffectiveHubRoles(hubDoc);
        effectiveReviewerIds = effectiveRoles.reviewerIds;
    } catch (error) {
        console.error('Failed to resolve effective hub reviewers for email invitation:', error);
    }
    const alreadyAssignedIds: string[] = (paper.peer_review?.assignedReviewers || []).map((r: any) => String(r));
    const activeAssignmentsCount =
        typeof MAX_ACTIVE_REVIEW_ASSIGNMENTS === 'number'
            ? await ReviewAssignment.countDocuments({
                    reviewerId: userId,
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
        (reason: string) => reason.includes('Conflict of interest') || reason.includes('already assigned')
    );

    if (hardStopReasons.length > 0) {
        return { ok: false, status: 403, error: 'Not eligible to accept this review', reasons: hardStopReasons };
    }

    const existingInvitation = await PaperReviewInvitation.findOne({
        paper: paperId,
        reviewer: userId
    });

    const inviteId = existingInvitation?._id || crypto.randomUUID();
    const invitation = existingInvitation
            ? existingInvitation
            : new PaperReviewInvitation({
                _id: inviteId,
                id: inviteId,
                paper: paperId,
                reviewer: userId,
                invitedBy: inviterId || userId,
                hubId,
                status: 'pending',
                customDeadlineDays: customDeadlineDays || 15,
                invitedAt: new Date()
            });

    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    invitation.customDeadlineDays = customDeadlineDays || invitation.customDeadlineDays || 15;
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
        (slot: any) => slot.status === 'available' || slot.status === 'declined'
    );

    if (!availableSlot) {
        return {
            ok: false,
            status: 400,
            error: 'No available review slots. All reviewer slots are already occupied.'
        };
    }

    availableSlot.reviewerId = userId;
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
        reviewer: userId,
        peerReviewType: 'selected',
        hubId,
        isLinkedToHub: !!hubId && !!paper.hubId,
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
        reviewerId: userId,
        status: 'accepted',
        assignedAt: new Date(),
        acceptedAt,
        deadline,
        hubId,
        isLinkedToHub: !!hubId && !!paper.hubId
    });
    await reviewAssignment.save();

    await assignHighestHubRole(
        userId,
        hubId,
        'Reviewer',
        String(inviterId || userId || 'system-review-invitation'),
        { auditUser: inviterId || userId || undefined }
    );

    invitation.reviewAssignmentId = assignmentId;
    await invitation.save();

    const paperDoc = await Papers.findOne({ id: typeof paper === 'object' ? paper.id : paper });
    if (paperDoc) {
        if (!paperDoc.reviewers) {
            paperDoc.reviewers = [];
        }
        if (!paperDoc.reviewers.includes(userId)) {
            paperDoc.reviewers.push(userId);
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
            (r: any) => r.reviewerId === userId
        );

        if (!existingResponse) {
            paperDoc.peer_review.responses.push({
                reviewerId: userId,
                status: 'accepted',
                responseDate: new Date(),
                assignedAt: new Date()
            });
        } else {
            existingResponse.status = 'accepted';
            existingResponse.responseDate = new Date();
            existingResponse.assignedAt = new Date();
        }

        if (!paperDoc.peer_review.assignedReviewers.some((r: any) => String(r) === userId)) {
            paperDoc.peer_review.assignedReviewers.push(userId);
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
                    await stripe.paymentIntents.capture(paperDoc.paymentHold.stripePaymentIntentId);
                    paperDoc.paymentHold.status = 'captured';
                    paperDoc.paymentHold.capturedAt = new Date();
                    paperDoc.paymentHold.receiptUrl = null;
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
                        endpoint: '/api/email-reviewer-invitation/convert',
                        trigger: 'required_email_reviewers_accepted',
                        requiredReviewers: REQUIRED_REVIEWERS
                    }
                });
                paperDoc.status = 'in review';
            } catch (transitionError) {
                if (transitionError instanceof EditorialTransitionError) {
                    console.warn('Email reviewer transition skipped:', transitionError.message);
                } else {
                    throw transitionError;
                }
            }
        }
    }

    if (inviterId) {
        const reviewerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        await NotificationService.createNotification({
            user: inviterId,
            type: 'reviewer_accepted_review',
            title: 'Reviewer Accepted Paper Review',
            content: `${reviewerName} accepted the invitation to review "${paper?.title}"`,
            relatedPaperId: typeof paper === 'object' ? paper.id : paper,
            relatedHubId: String(hubId),
            actionUrl: `/notifications`,
            priority: 'medium',
            metadata: {
                reviewerName,
                reviewerId: userId,
                paperTitle: paper?.title
            }
        });
    }

    return { ok: true, inviteId: invitation._id };
}

export async function POST({ request }) {
    try {
        await start_mongo();
        
        const { token, userId } = await request.json();

        if (!token || !userId) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find the email invitation
        const emailInvitation = await EmailReviewerInvitation.findOne({ 
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!emailInvitation) {
            return json({ error: 'Invalid or expired invitation' }, { status: 404 });
        }

        // Get hub information
        const hub = await Hub.findById(emailInvitation.hubId);
        if (!hub) {
            console.error('Hub not found:', emailInvitation.hubId);
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        const normalizedUserId = String(userId);
        const reviewerUser = await findUserByAnyId(normalizedUserId);
        const reviewerName = reviewerUser
            ? `${reviewerUser.firstName || ''} ${reviewerUser.lastName || ''}`.trim() || reviewerUser.email || normalizedUserId
            : normalizedUserId;
        const managerId = String(emailInvitation.invitedBy || '');
        const managerUser = await findUserByAnyId(managerId);

        const hubDoc = await Hubs.findById(emailInvitation.hubId);
        if (!hubDoc) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        await assignHighestHubRole(
            normalizedUserId,
            String(emailInvitation.hubId),
            'Reviewer',
            managerId || normalizedUserId,
            { auditUser: managerId || normalizedUserId }
        );

        // Check if reviewer invitation already exists
        const existingInvitation = await Invitation.findOne({
            reviewer: userId,
            hubId: emailInvitation.hubId,
            status: 'pending'
        });

        if (existingInvitation) {
            if (emailInvitation.paperId) {
                existingInvitation.status = 'accepted';
                existingInvitation.respondedAt = new Date();
                existingInvitation.updatedAt = new Date();
                await existingInvitation.save();
            }

            // Mark email invitation as accepted (converted)
            emailInvitation.status = 'accepted';
            emailInvitation.updatedAt = new Date();
            await emailInvitation.save();
            
            if (emailInvitation.paperId) {
                const acceptanceResult = await acceptPaperReviewInvite({
                    userId: normalizedUserId,
                    inviterId: emailInvitation.invitedBy || null,
                    paperId: String(emailInvitation.paperId),
                    hubId: String(emailInvitation.hubId),
                    customDeadlineDays: emailInvitation.customDeadlineDays
                });

                if (!acceptanceResult.ok) {
                    return json(
                        { error: acceptanceResult.error || 'Failed to accept paper review invitation' },
                        { status: acceptanceResult.status || 500 }
                    );
                }
            }

            if (managerId) {
                try {
                    await notifyManagerInvitationAccepted({
                        managerId,
                        managerEmail: managerUser?.email || null,
                        managerName: managerUser
                            ? `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim()
                            : null,
                        reviewerId: normalizedUserId,
                        reviewerName,
                        hubId: String(emailInvitation.hubId),
                        hubName: hub.title || hub.name || 'SciLedger Hub',
                        paperId: emailInvitation.paperId ? String(emailInvitation.paperId) : null
                    });
                } catch (notifyError) {
                    console.error('Failed to notify manager about accepted invitation:', notifyError);
                }
            }

            return json({
                success: true,
                message: 'Invitation already exists',
                invitationId: existingInvitation._id
            });
        }

        // Create a hub reviewer invitation
        const invitationId = crypto.randomUUID();
        const hubInvitation = new Invitation({
            _id: invitationId,
            id: invitationId,
            reviewer: userId,
            hubId: emailInvitation.hubId,
            status: emailInvitation.paperId ? 'accepted' : 'pending',
            assignedAt: new Date(),
            respondedAt: emailInvitation.paperId ? new Date() : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await hubInvitation.save();

        // Create notification for the user
        const inviterName = managerUser
            ? `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim() || managerUser.email || 'Hub Admin'
            : 'Hub Admin';
        
        let notification: any = null;
        if (!emailInvitation.paperId) {
            notification = await NotificationService.createHubInvitationNotification({
                userId: userId,
                hubId: String(emailInvitation.hubId),
                hubName: hub.title,
                inviterName: inviterName,
                role: 'reviewer'
            });
        }

        if (emailInvitation.paperId) {
            const acceptanceResult = await acceptPaperReviewInvite({
                userId: normalizedUserId,
                inviterId: emailInvitation.invitedBy || null,
                paperId: String(emailInvitation.paperId),
                hubId: String(emailInvitation.hubId),
                customDeadlineDays: emailInvitation.customDeadlineDays
            });

            if (!acceptanceResult.ok) {
                return json(
                    { error: acceptanceResult.error || 'Failed to accept paper review invitation' },
                    { status: acceptanceResult.status || 500 }
                );
            }
        }

        if (managerId) {
            try {
                await notifyManagerInvitationAccepted({
                    managerId,
                    managerEmail: managerUser?.email || null,
                    managerName: managerUser
                        ? `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim()
                        : null,
                    reviewerId: normalizedUserId,
                    reviewerName,
                    hubId: String(emailInvitation.hubId),
                    hubName: hub.title || hub.name || 'SciLedger Hub',
                    paperId: emailInvitation.paperId ? String(emailInvitation.paperId) : null
                });
            } catch (notifyError) {
                console.error('Failed to notify manager about accepted invitation:', notifyError);
            }
        }

        // Mark email invitation as accepted (converted to hub invitation)
        emailInvitation.status = 'accepted';
        emailInvitation.updatedAt = new Date();
        await emailInvitation.save();

        return json({
            success: true,
            message: 'Invitation converted successfully',
            invitationId: hubInvitation._id,
            notificationId: notification?._id
        });

    } catch (error) {
        console.error('Error converting invitation:', error);
        return json({ 
            error: 'Failed to convert invitation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
