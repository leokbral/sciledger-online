import Notification from '$lib/db/models/Notification';
import { json } from '@sveltejs/kit';

export async function POST({ locals }) {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Marcar todas as notificações não lidas do usuário como lidas
        const result = await Notification.updateMany(
            { 
                user: user.id,
                isRead: false
            },
            { 
                isRead: true,
                readAt: new Date(),
                updatedAt: new Date()
            }
        );

        return json({ 
            success: true, 
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return json({
            error: 'Failed to mark all notifications as read',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}