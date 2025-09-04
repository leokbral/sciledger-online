import Notification from '$lib/db/models/Notification';
import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const count = await Notification.countDocuments({
            user: user.id,
            isRead: false
        });

        return json({ success: true, count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return json({ error: 'Failed to fetch unread count' }, { status: 500 });
    }
}