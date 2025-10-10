import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NotificationService } from '$lib/services/NotificationService';

export const POST: RequestHandler = async ({ locals }) => {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        await NotificationService.markAllAsRead(user._id);

        return json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Error marking all as read:', error);
        return json({ 
            error: 'Failed to mark all notifications as read',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};