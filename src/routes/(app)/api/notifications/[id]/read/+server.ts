import Notification from '$lib/db/models/Notification';
import { json } from '@sveltejs/kit';

export async function POST({ params, locals }) {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notificationId = params.id;

        // Verificar se a notificação pertence ao usuário
        const notification = await Notification.findOne({
            _id: notificationId,
            user: user.id
        });

        if (!notification) {
            return json({ error: 'Notification not found' }, { status: 404 });
        }

        const updatedNotification = await Notification.findByIdAndUpdate(
            notificationId,
            { 
                isRead: true,
                readAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        );

        return json({ success: true, notification: updatedNotification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return json({
            error: 'Failed to mark notification as read',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}