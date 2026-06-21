import { db } from '$lib/db/mongo';
import { emitEvent } from '$lib/services/EventService';

export interface ReviewDeadlineStatus {
    assignment: any;
    daysRemaining: number;
    isOverdue: boolean;
    hoursRemaining?: number;
}

export async function checkReviewDeadlines(): Promise<ReviewDeadlineStatus[]> {
    const now = new Date();
    
    // Fetch all accepted reviews not yet completed
    const activeAssignments = await db.collection('reviewAssignments').find({
        status: 'accepted',
        deadline: { $exists: true }
    }).toArray();

    const deadlineStatuses: ReviewDeadlineStatus[] = [];

    for (const assignment of activeAssignments) {
        const deadline = new Date(assignment.deadline);
        const timeDiff = deadline.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const hoursRemaining = Math.ceil(timeDiff / (1000 * 3600));
        
        const status: ReviewDeadlineStatus = {
            assignment,
            daysRemaining,
            isOverdue: timeDiff < 0,
            hoursRemaining: hoursRemaining > 0 ? hoursRemaining : 0
        };

        deadlineStatuses.push(status);

        // Update status if overdue
        if (timeDiff < 0 && assignment.status !== 'overdue') {
            await db.collection('reviewAssignments').updateOne(
                { _id: assignment._id },
                { 
                    $set: { 
                        status: 'overdue',
                        updatedAt: now
                    }
                }
            );
        }
    }

    return deadlineStatuses;
}

export async function sendReviewReminders(): Promise<void> {
    const deadlineStatuses = await checkReviewDeadlines();
    const now = new Date();

    for (const status of deadlineStatuses) {
        const { assignment, daysRemaining, isOverdue } = status;
        const lastReminder = assignment.lastReminderAt ? new Date(assignment.lastReminderAt) : null;
        const daysSinceLastReminder = lastReminder ? 
            Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 3600 * 24)) : 999;

        let shouldSendReminder = false;
        let reminderType = '';

        // Reminder logic
        if (isOverdue && daysSinceLastReminder >= 1) {
            shouldSendReminder = true;
            reminderType = 'overdue';
        } else if (daysRemaining <= 1 && daysRemaining > 0 && daysSinceLastReminder >= 1) {
            shouldSendReminder = true;
            reminderType = 'urgent';
        } else if (daysRemaining <= 3 && daysRemaining > 1 && daysSinceLastReminder >= 2) {
            shouldSendReminder = true;
            reminderType = 'warning';
        } else if (daysRemaining <= 7 && daysRemaining > 3 && daysSinceLastReminder >= 3) {
            shouldSendReminder = true;
            reminderType = 'reminder';
        }

        if (shouldSendReminder) {
            await sendDeadlineReminder(assignment, reminderType, daysRemaining);
        }
    }
}

async function sendDeadlineReminder(assignment: any, reminderType: string, daysRemaining: number) {
    const paper = await db.collection('papers').findOne({ _id: assignment.paperId });
    if (!paper) return;

    const reviewerId = String(assignment.reviewerId || '');
    if (!reviewerId) return;
    const editorId = paper.submittedBy ? String(paper.submittedBy) : '';
    const recipients = [
        ...new Set([reviewerId, reminderType === 'overdue' ? editorId : ''].filter(Boolean))
    ];

    await emitEvent({
        type: reminderType === 'overdue' ? 'review.deadline.overdue' : 'review.deadline.reminder',
        actorId: null,
        recipients,
        entityType: 'review',
        entityId: String(assignment.id || assignment._id),
        metadata: {
            paperId: String(paper.id || assignment.paperId),
            paperTitle: paper.title,
            hubId: paper.hubId ? String(paper.hubId) : null,
            reviewerId,
            deadline: assignment.deadline ? new Date(assignment.deadline).toISOString() : undefined,
            reminderType,
            daysRemaining,
            recipientRoles: Object.fromEntries(
                recipients.map((recipientId) => [
                    recipientId,
                    recipientId === reviewerId ? 'reviewer' : 'editor'
                ])
            )
        }
    });

    // Atualizar contador de lembretes
    await db.collection('reviewAssignments').updateOne(
        { _id: assignment._id },
        { 
            $inc: { remindersSent: 1 },
            $set: { 
                lastReminderAt: new Date(),
                updatedAt: new Date()
            }
        }
    );
}

export function calculateDeadlineInfo(acceptedAt: Date | string, deadline?: Date | string) {
    const accepted = new Date(acceptedAt);
    const due = deadline ? new Date(deadline) : new Date(accepted.getTime() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const timeDiff = due.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const hoursRemaining = Math.ceil(timeDiff / (1000 * 3600));
    
    return {
        deadline: due,
        daysRemaining,
        hoursRemaining,
        isOverdue: timeDiff < 0,
        timeRemaining: formatTimeRemaining(daysRemaining, hoursRemaining, timeDiff < 0)
    };
}

function formatTimeRemaining(days: number, hours: number, isOverdue: boolean): string {
    if (isOverdue) {
        const overdueDays = Math.abs(days);
        return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    }
    
    if (days > 1) {
        return `${days} days remaining`;
    } else if (days === 1) {
        return '1 day remaining';
    } else if (hours > 1) {
        return `${hours} hours remaining`;
    } else if (hours === 1) {
        return '1 hour remaining';
    } else {
        return 'Due very soon';
    }
}
