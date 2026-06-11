import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkReviewDeadlines, sendReviewReminders } from '$lib/helpers/reviewDeadlineHelper';
import { can } from '$lib/server/authorization/authorizationService';
import { hasReviewerCapability } from '$lib/server/authorization/reviewerCapability';
import { getUserIdAliases } from '$lib/server/authorization/roleResolver';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        // Permitir acesso para admins e revisores (para ver seus próprios deadlines)
        const isAdmin = locals.user ? await can(locals.user, 'rbac.manage') : false;
        const isReviewer = locals.user ? await hasReviewerCapability(locals.user) : false;

        if (!isAdmin && !isReviewer) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sendReminders = url.searchParams.get('sendReminders') === 'true';
        const reviewerId = url.searchParams.get('reviewerId');

        const deadlineStatuses = await checkReviewDeadlines();

        // Se sendReminders for true e for admin, enviar lembretes
        if (sendReminders && isAdmin) {
            await sendReviewReminders();
        }

        // Filtrar por reviewerId se especificado
        let filteredStatuses = deadlineStatuses;
        const userAliases = locals.user ? getUserIdAliases(locals.user) : [];
        if (reviewerId && isAdmin) {
            filteredStatuses = deadlineStatuses.filter(
                status => status.assignment.reviewerId === reviewerId
            );
        } else if (reviewerId && !userAliases.includes(reviewerId)) {
            return json({ error: 'Unauthorized reviewerId filter' }, { status: 403 });
        } else if (!isAdmin) {
            // Se não for admin, mostrar apenas os próprios deadlines
            filteredStatuses = deadlineStatuses.filter(
                status => userAliases.includes(String(status.assignment.reviewerId))
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
            remindersEnabled: sendReminders && isAdmin
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
        const isAdmin = locals.user ? await can(locals.user, 'rbac.manage') : false;
        if (!isAdmin) {
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
