import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NotificationService } from '$lib/services/NotificationService';

export const DELETE: RequestHandler = async ({ params, locals }) => {
    try {
        const user = locals.user;
        const notificationId = params.id;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!notificationId) {
            return json({ error: 'Notification ID is required' }, { status: 400 });
        }

        const result = await NotificationService.deleteNotification(notificationId, user._id);

        if (!result) {
            return json({ error: 'Notification not found' }, { status: 404 });
        }

        return json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        return json({ 
            error: 'Failed to delete notification',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const user = locals.user;
        const notificationId = params.id;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!notificationId) {
            return json({ error: 'Notification ID is required' }, { status: 400 });
        }

        // Buscar notificação específica (implementar se necessário)
        return json({ error: 'Method not implemented' }, { status: 501 });

    } catch (error) {
        console.error('Error fetching notification:', error);
        return json({ 
            error: 'Failed to fetch notification',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};