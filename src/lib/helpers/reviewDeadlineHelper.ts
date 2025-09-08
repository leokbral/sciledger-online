import { db } from '$lib/db/mongo';
import { createNotification} from './notificationHelper';

export interface ReviewDeadlineStatus {
    assignment: any;
    daysRemaining: number;
    isOverdue: boolean;
    hoursRemaining?: number;
}

export async function checkReviewDeadlines(): Promise<ReviewDeadlineStatus[]> {
    const now = new Date();
    
    // Buscar todas as revisões aceitas que ainda não foram completadas
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

        // Atualizar status se vencido
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

        // Lógica de lembretes
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

    let notificationTemplate;
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

    switch (reminderType) {
        case 'overdue':
            notificationTemplate = {
                title: 'Review Overdue',
                content: `Your review for "${paper.title}" is overdue. Please complete it as soon as possible.`,
                priority: 'urgent' as const
            };
            priority = 'urgent';
            break;
        case 'urgent':
            notificationTemplate = {
                title: 'Review Due Soon',
                content: `Your review for "${paper.title}" is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please complete it soon.`,
                priority: 'high' as const
            };
            priority = 'high';
            break;
        case 'warning':
            notificationTemplate = {
                title: 'Review Deadline Approaching',
                content: `Reminder: Your review for "${paper.title}" is due in ${daysRemaining} days.`,
                priority: 'medium' as const
            };
            break;
        default:
            notificationTemplate = {
                title: 'Review Reminder',
                content: `Don't forget: Your review for "${paper.title}" is due in ${daysRemaining} days.`,
                priority: 'medium' as const
            };
    }

    await createNotification({
        userId: assignment.reviewerId,
        type: 'review_request',
        title: notificationTemplate.title,
        content: notificationTemplate.content,
        relatedPaperId: assignment.paperId,
        relatedReviewId: assignment.id,
        priority,
        actionUrl: `/review/inreview/${paper.id}`
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