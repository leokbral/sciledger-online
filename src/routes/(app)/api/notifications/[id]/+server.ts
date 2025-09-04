import Notification from '$lib/db/models/Notification';
import { json } from '@sveltejs/kit';

export async function DELETE({ params, locals }) {
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

        await Notification.deleteOne({ _id: notificationId });

        return json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return json({
            error: 'Failed to delete notification',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function PATCH({ params, request, locals }) {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notificationId = params.id;
        const updates = await request.json();

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
                ...updates,
                updatedAt: new Date()
            },
            { new: true }
        );

        return json({ success: true, notification: updatedNotification });
    } catch (error) {
        console.error('Error updating notification:', error);
        return json({
            error: 'Failed to update notification',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}