import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NotificationService } from '$lib/services/NotificationService';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        const user = locals.user;

        if (!user || !user._id) {
            return json({
                success: true,
                notifications: [],
                message: 'User not authenticated'
            });
        }

        const searchParams = url.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const type = searchParams.get('type') || undefined;

        const options = {
            limit,
            unreadOnly,
            type: type as import('$lib/types/Notification').NotificationType | undefined
        };

        const notifications = await NotificationService.getUserNotifications(user._id, options);

        return json({
            success: true,
            notifications: notifications || []
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return json({ 
            success: false,
            notifications: [],
            error: 'Failed to fetch notifications',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};