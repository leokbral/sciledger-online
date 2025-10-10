import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NotificationService } from '$lib/services/NotificationService';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const user = locals.user;

        if (!user || !user._id) {
            return json({
                success: true,
                count: 0,
                unreadCount: 0,
                message: 'User not authenticated'
            });
        }

        const unreadCount = await NotificationService.getUnreadCount(user._id);

        return json({
            success: true,
            count: unreadCount || 0,
            unreadCount: unreadCount || 0  // Compatibilidade com diferentes componentes
        });

    } catch (error) {
        console.error('Error fetching unread count:', error);
        return json({ 
            success: false,
            count: 0,
            unreadCount: 0,
            error: 'Failed to fetch unread count',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};