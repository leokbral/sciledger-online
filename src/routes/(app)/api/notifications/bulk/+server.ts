import Notification from '$lib/db/models/Notification';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, notificationIds } = await request.json();

        if (!action || !notificationIds || !Array.isArray(notificationIds)) {
            return json({ error: 'Invalid request data' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'delete':
                result = await Notification.deleteMany({
                    _id: { $in: notificationIds },
                    user: user.id
                });
                break;

            case 'mark_read':
                result = await Notification.updateMany(
                    {
                        _id: { $in: notificationIds },
                        user: user.id
                    },
                    {
                        isRead: true,
                        readAt: new Date(),
                        updatedAt: new Date()
                    }
                );
                break;

            case 'mark_unread':
                result = await Notification.updateMany(
                    {
                        _id: { $in: notificationIds },
                        user: user.id
                    },
                    {
                        isRead: false,
                        readAt: null,
                        updatedAt: new Date()
                    }
                );
                break;

            default:
                return json({ error: 'Invalid action' }, { status: 400 });
        }

        return json({ 
            success: true, 
            message: `${action} completed successfully`,
            modifiedCount: result.modifiedCount || result.deletedCount
        });
    } catch (error) {
        console.error('Error performing bulk action:', error);
        return json({
            error: 'Failed to perform bulk action',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}