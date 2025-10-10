import Notification, { type INotification } from '../db/models/Notification';
import { start_mongo } from '$lib/db/mongooseConnection';
import type { NotificationType } from '$lib/types/Notification';
import * as crypto from 'crypto';

export class NotificationService {
    static async createNotification(data: Partial<INotification>) {
        await start_mongo();
        
        const notification = new Notification({
            _id: crypto.randomUUID(),
            ...data
        });
        
        await notification.save();
        return notification;
    }

    static async getUserNotifications(userId: string, options?: {
        limit?: number;
        unreadOnly?: boolean;
        type?: NotificationType;

    }) {
        await start_mongo();
        
        const query: Record<string, unknown> = { user: userId };
        
        if (options?.unreadOnly) {
            query.isRead = false;
        }
        
        if (options?.type) {
            query.type = options.type;
        }

        return await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(options?.limit || 50)
            .populate('relatedUser', 'name email profilePicture');
    }

    static async markAsRead(notificationId: string, userId: string) {
        await start_mongo();
        
        return await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { 
                isRead: true,
                readAt: new Date()
            },
            { new: true }
        );
    }

    static async markAllAsRead(userId: string) {
        await start_mongo();
        
        return await Notification.updateMany(
            { user: userId, isRead: false },
            { 
                isRead: true,
                readAt: new Date()
            }
        );
    }

    static async getUnreadCount(userId: string) {
        await start_mongo();
        
        return await Notification.countDocuments({
            user: userId,
            isRead: false
        });
    }

    static async deleteNotification(notificationId: string, userId: string) {
        await start_mongo();
        
        return await Notification.findOneAndDelete({
            _id: notificationId,
            user: userId
        });
    }

    // Métodos específicos para diferentes tipos de notificação
    static async createPaperReviewRequest(data: {
        reviewerId: string;
        paperId: string;
        paperTitle: string;
        authorName: string;
        hubId?: string;
        hubName?: string;
    }) {
        const isHubPaper = !!data.hubId;
        
        return await this.createNotification({
            user: data.reviewerId,
            type: 'review_request',
            title: `Nova solicitação de revisão`,
            content: isHubPaper 
                ? `You have been invited to review the paper "${data.paperTitle}" in the hub "${data.hubName}"`
                : `You have been invited to review the paper "${data.paperTitle}" by ${data.authorName}`,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/papers/${data.paperId}/review`,
            priority: 'high',
            metadata: {
                paperTitle: data.paperTitle,
                authorName: data.authorName,
                hubName: data.hubName,
                isHubPaper
            }
        });
    }

    static async createPaperSubmittedNotification(data: {
        adminIds: string[];
        paperId: string;
        paperTitle: string;
        authorName: string;
        hubId?: string;
        hubName?: string;
    }) {
        const isHubPaper = !!data.hubId;
        
        const notifications = data.adminIds.map(adminId => ({
            user: adminId,
            type: isHubPaper ? 'hub_paper_pending' as const : 'standalone_paper_pending' as const,
            title: `New Pending Paper Submission`,
            content: isHubPaper
                ? `A new paper "${data.paperTitle}" has been submitted to the hub "${data.hubName}" and is awaiting approval`
                : `A new paper "${data.paperTitle}" by ${data.authorName} is awaiting approval`,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/admin/papers/${data.paperId}`,
            priority: 'medium' as const,
            metadata: {
                paperTitle: data.paperTitle,
                authorName: data.authorName,
                hubName: data.hubName,
                isHubPaper
            }
        }));

        for (const notificationData of notifications) {
            await this.createNotification(notificationData);
        }
    }

    static async createHubInvitationNotification(data: {
        userId: string;
        hubId: string;
        hubName: string;
        inviterName: string;
        role: string;
    }) {
        return await this.createNotification({
            user: data.userId,
            type: 'hub_invitation',
            title: `Hub Invitation`,
            content: `${data.inviterName} invited you to join the hub "${data.hubName}" as ${data.role}`,
            relatedHubId: data.hubId,
            actionUrl: `/hubs/${data.hubId}/invitation`,
            priority: 'high',
            metadata: {
                hubName: data.hubName,
                inviterName: data.inviterName,
                role: data.role
            }
        });
    }

    // NEW NOTIFICATION METHODS FOR PAPER REVIEW LIFECYCLE

    /**
     * Scenario 1: When an editor accepts a paper for review
     */
    static async createPaperAcceptedForReviewNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        reviewerIds: string[];
        editorName: string;
        hubId?: string;
        hubName?: string;
    }) {
        const notifications = [];

        // Notify the author that the paper has been accepted for review
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'paper_accepted_for_review',
                title: `Paper Accepted for Review`,
                content: `Your paper "${data.paperTitle}" has been accepted for review by ${data.editorName}`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    editorName: data.editorName,
                    hubName: data.hubName
                }
            })
        );

        // Notify the assigned reviewers with the paper details
        for (const reviewerId of data.reviewerIds) {
            notifications.push(
                this.createNotification({
                    user: reviewerId,
                    type: 'reviewer_assigned',
                    title: `New Paper for Review`,
                    content: `You have been assigned to review the paper "${data.paperTitle}" by ${data.authorName}`,
                    relatedPaperId: data.paperId,
                    relatedUser: data.authorId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}/review`,
                    priority: 'high',
                    metadata: {
                        paperTitle: data.paperTitle,
                        authorName: data.authorName,
                        editorName: data.editorName,
                        hubName: data.hubName
                    }
                })
            );
        }

        return Promise.all(notifications);
    }

    /**
     * Scenario 2: When a reviewer accepts to review a paper
     */
    static async createReviewerAcceptedNotifications(data: {
        paperId: string;
        paperTitle: string;
        reviewerId: string;
        reviewerName: string;
        authorId: string;
        editorId: string;
        hubId?: string;
    }) {
        const notifications = [];

        // Notify the editor that the reviewer has accepted
        notifications.push(
            this.createNotification({
                user: data.editorId,
                type: 'reviewer_accepted_review',
                title: `Reviewer Accepted Review`,
                content: `${data.reviewerName} has accepted to review the paper "${data.paperTitle}"`,
                relatedPaperId: data.paperId,
                relatedUser: data.reviewerId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/manage`,
                priority: 'medium',
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName
                }
            })
        );

        // Notify the author that the reviewer has accepted
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'reviewer_accepted_review',
                title: `Reviewer Assigned`,
                content: `A reviewer has accepted to review your paper "${data.paperTitle}"`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'medium',
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName
                }
            })
        );

        return Promise.all(notifications);
    }

    /**
     * Scenario 3: When a reviewer submits their review
     */
    static async createReviewSubmittedNotifications(data: {
        paperId: string;
        paperTitle: string;
        reviewId: string;
        reviewerId: string;
        reviewerName: string;
        authorId: string;
        editorId: string;
        reviewDecision: 'accept' | 'reject' | 'minor_revision' | 'major_revision';
        hubId?: string;
    }) {
        const notifications = [];

        const decisionText = {
            'accept': 'recomendou a aceitação',
            'reject': 'recomendou a rejeição',
            'minor_revision': 'solicitou revisões menores',
            'major_revision': 'solicitou revisões maiores'
        };

        // Notify the editor that the review has been completed
        notifications.push(
            this.createNotification({
                user: data.editorId,
                type: 'review_submitted',
                title: `Review Completed`,
                content: `${data.reviewerName} has completed the review of the paper "${data.paperTitle}" and ${decisionText[data.reviewDecision]}`,
                relatedPaperId: data.paperId,
                relatedReviewId: data.reviewId,
                relatedUser: data.reviewerId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/reviews/${data.reviewId}`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName,
                    reviewDecision: data.reviewDecision
                }
            })
        );

        // Notify the author that the review has been completed (depending on the decision)
        const shouldNotifyAuthor = ['minor_revision', 'major_revision', 'accept'].includes(data.reviewDecision);
        if (shouldNotifyAuthor) {
            notifications.push(
                this.createNotification({
                    user: data.authorId,
                    type: 'review_submitted',
                    title: `Review Received`,
                    content: `Your paper "${data.paperTitle}" has been reviewed. The reviewer ${decisionText[data.reviewDecision]}.`,
                    relatedPaperId: data.paperId,
                    relatedReviewId: data.reviewId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}/reviews`,
                    priority: 'high',
                    metadata: {
                        paperTitle: data.paperTitle,
                        reviewDecision: data.reviewDecision
                    }
                })
            );
        }

        return Promise.all(notifications);
    }

    /**
     * Scenario 4: When the author submits corrections
     */
    static async createCorrectionsSubmittedNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        editorId: string;
        reviewerIds: string[];
        correctionVersion: number;
        requiresNewReview: boolean;
        hubId?: string;
    }) {
        const notifications = [];

        // Notify the editor
        notifications.push(
            this.createNotification({
                user: data.editorId,
                type: 'corrections_submitted',
                title: `Corrections Submitted`,
                content: `${data.authorName} has submitted version ${data.correctionVersion} with corrections for the paper "${data.paperTitle}"`,
                relatedPaperId: data.paperId,
                relatedUser: data.authorId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/corrections`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    authorName: data.authorName,
                    correctionVersion: data.correctionVersion,
                    requiresNewReview: data.requiresNewReview
                }
            })
        );

        // If a new review round is required, notify the reviewers
        if (data.requiresNewReview) {
            for (const reviewerId of data.reviewerIds) {
                notifications.push(
                    this.createNotification({
                        user: reviewerId,
                        type: 'corrections_submitted',
                        title: `New Version for Review`,
                        content: `${data.authorName} has submitted corrections for the paper "${data.paperTitle}". A new review is required.`,
                        relatedPaperId: data.paperId,
                        relatedUser: data.authorId,
                        relatedHubId: data.hubId,
                        actionUrl: `/papers/${data.paperId}/review`,
                        priority: 'high',
                        metadata: {
                            paperTitle: data.paperTitle,
                            authorName: data.authorName,
                            correctionVersion: data.correctionVersion
                        }
                    })
                );
            }
        }

        return Promise.all(notifications);
    }

    /**
     * Scenario 5: When the paper is accepted for publication
     */
    static async createPaperFinalAcceptanceNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        editorId: string;
        editorName: string;
        reviewerIds: string[];
        hubId?: string;
        hubName?: string;
        publicationDate?: Date;
    }) {
        const notifications = [];

        // Notify the author of the final acceptance
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'paper_final_acceptance',
                title: `Paper Accepted for Publication! 🎉`,
                content: `Congratulations! Your paper "${data.paperTitle}" has been accepted for publication by ${data.editorName}`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'urgent',
                metadata: {
                    paperTitle: data.paperTitle,
                    editorName: data.editorName,
                    hubName: data.hubName,
                    publicationDate: data.publicationDate
                }
            })
        );

        // Optionally notify reviewers of the final status
        for (const reviewerId of data.reviewerIds) {
            notifications.push(
                this.createNotification({
                    user: reviewerId,
                    type: 'paper_final_acceptance',
                    title: `Paper Accepted for Publication`,
                    content: `The paper "${data.paperTitle}" you reviewed has been accepted for publication`,
                    relatedPaperId: data.paperId,
                    relatedUser: data.authorId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}`,
                    priority: 'low',
                    metadata: {
                        paperTitle: data.paperTitle,
                        authorName: data.authorName,
                        hubName: data.hubName
                    }
                })
            );
        }

        return Promise.all(notifications);
    }

    /**
     * Scenario 6: When the paper is finally rejected
     */
    static async createPaperFinalRejectionNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        editorId: string;
        editorName: string;
        reviewerIds: string[];
        rejectionReason?: string;
        hubId?: string;
        hubName?: string;
    }) {
        const notifications = [];

        // Notify the author of the final rejection
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'paper_final_rejection',
                title: `Final Decision on Paper`,
                content: `Your paper "${data.paperTitle}" has not been accepted for publication. ${data.rejectionReason || 'Please refer to the reviewers\' comments for more details.'}`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    editorName: data.editorName,
                    rejectionReason: data.rejectionReason,
                    hubName: data.hubName
                }
            })
        );

        // Optionally notify reviewers of the final status
        for (const reviewerId of data.reviewerIds) {
            notifications.push(
                this.createNotification({
                    user: reviewerId,
                    type: 'paper_final_rejection',
                    title: `Final Decision on Paper`,
                    content: `The paper "${data.paperTitle}" you reviewed has not been accepted for publication`,
                    relatedPaperId: data.paperId,
                    relatedUser: data.authorId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}`,
                    priority: 'low',
                    metadata: {
                        paperTitle: data.paperTitle,
                        authorName: data.authorName,
                        hubName: data.hubName
                    }
                })
            );
        }

        return Promise.all(notifications);
    }
}