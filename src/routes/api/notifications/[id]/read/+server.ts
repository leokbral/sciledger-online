import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NotificationService } from '$lib/services/NotificationService';

export const POST: RequestHandler = async ({ params, locals }) => {
    try {
        const user = locals.user;
        const notificationId = params.id;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!notificationId) {
            return json({ error: 'Notification ID is required' }, { status: 400 });
        }

        const notification = await NotificationService.markAsRead(notificationId, user._id);

        if (!notification) {
            return json({ error: 'Notification not found' }, { status: 404 });
        }

        return json({
            success: true,
            notification
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        return json({ 
            error: 'Failed to mark notification as read',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};