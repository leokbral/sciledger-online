import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkReviewDeadlines, sendReviewReminders } from '$lib/helpers/reviewDeadlineHelper';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        // Permitir acesso para admins e revisores (para ver seus próprios deadlines)
        if (!locals.user?.roles?.admin && !locals.user?.roles?.reviewer) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sendReminders = url.searchParams.get('sendReminders') === 'true';
        const reviewerId = url.searchParams.get('reviewerId');

        const deadlineStatuses = await checkReviewDeadlines();

        // Se sendReminders for true e for admin, enviar lembretes
        if (sendReminders && locals.user?.roles?.admin) {
            await sendReviewReminders();
        }

        // Filtrar por reviewerId se especificado
        let filteredStatuses = deadlineStatuses;
        if (reviewerId) {
            filteredStatuses = deadlineStatuses.filter(
                status => status.assignment.reviewerId === reviewerId
            );
        } else if (!locals.user?.roles?.admin) {
            // Se não for admin, mostrar apenas os próprios deadlines
            filteredStatuses = deadlineStatuses.filter(
                status => status.assignment.reviewerId === locals.user._id
            );
        }

        const overdue = filteredStatuses.filter(s => s.isOverdue);
        const urgent = filteredStatuses.filter(s => s.daysRemaining <= 1 && !s.isOverdue);
        const warning = filteredStatuses.filter(s => s.daysRemaining <= 3 && s.daysRemaining > 1);
        const normal = filteredStatuses.filter(s => s.daysRemaining > 3);

        return json({
            success: true,
            summary: {
                total: filteredStatuses.length,
                overdue: overdue.length,
                urgent: urgent.length,
                warning: warning.length,
                normal: normal.length
            },
            deadlines: filteredStatuses.map(status => ({
                assignmentId: status.assignment.id,
                paperId: status.assignment.paperId,
                reviewerId: status.assignment.reviewerId,
                daysRemaining: status.daysRemaining,
                hoursRemaining: status.hoursRemaining,
                isOverdue: status.isOverdue,
                deadline: status.assignment.deadline,
                acceptedAt: status.assignment.acceptedAt,
                remindersSent: status.assignment.remindersSent,
                lastReminderAt: status.assignment.lastReminderAt
            })),
            remindersEnabled: sendReminders && locals.user?.roles?.admin
        });

    } catch (error) {
        console.error('Error checking deadlines:', error);
        return json({
            success: false,
            error: 'Failed to check deadlines',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ locals }) => {
    try {
        // Verificar se é admin ou sistema
        if (!locals.user?.roles?.admin) {
            return json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const deadlineStatuses = await checkReviewDeadlines();
        await sendReviewReminders();

        const overdue = deadlineStatuses.filter(s => s.isOverdue);
        const urgent = deadlineStatuses.filter(s => s.daysRemaining <= 1 && !s.isOverdue);
        const warning = deadlineStatuses.filter(s => s.daysRemaining <= 3 && s.daysRemaining > 1);
        const normal = deadlineStatuses.filter(s => s.daysRemaining > 3);

        return json({
            success: true,
            message: 'Deadline check completed and reminders sent',
            summary: {
                total: deadlineStatuses.length,
                overdue: overdue.length,
                urgent: urgent.length,
                warning: warning.length,
                normal: normal.length
            },
            deadlines: deadlineStatuses.map(status => ({
                assignmentId: status.assignment.id,
                paperId: status.assignment.paperId,
                reviewerId: status.assignment.reviewerId,
                daysRemaining: status.daysRemaining,
                hoursRemaining: status.hoursRemaining,
                isOverdue: status.isOverdue,
                deadline: status.assignment.deadline,
                acceptedAt: status.assignment.acceptedAt,
                remindersSent: status.assignment.remindersSent,
                lastReminderAt: status.assignment.lastReminderAt
            })),
            remindersTriggered: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error checking deadlines:', error);
        return json({
            success: false,
            error: 'Failed to check deadlines',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};