import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Notifications from '$lib/db/models/Notification';
import { start_mongo } from '$lib/db/mongooseConnection';

await start_mongo();

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { notificationId } = await request.json();

        if (!notificationId) {
            return json({ error: 'Notification ID is required' }, { status: 400 });
        }

        // Marcar a notificação como lida
        const result = await Notifications.updateOne(
            { 
                _id: notificationId,
                user: user._id 
            },
            { 
                $set: { 
                    isRead: true,
                    readAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return json({ error: 'Notification not found' }, { status: 404 });
        }

        return json({ success: true });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        return json({ 
            error: 'Failed to mark notification as read',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};