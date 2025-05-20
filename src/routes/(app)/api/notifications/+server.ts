import { json } from '@sveltejs/kit';
import { NotificationSchema } from '$lib/db/schemas/tempschema/NotificationSchema';
import mongoose from 'mongoose';

const Notification = mongoose.model('Notification', NotificationSchema);

export async function POST({ request }) {
    try {
        const data = await request.json();
        
        const notification = new Notification({
            _id: new mongoose.Types.ObjectId().toString(),
            ...data
        });

        await notification.save();

        return json({ success: true, notification });
    } catch (error) {
        console.error('Error creating notification:', error);
        return json({ success: false, error: 'Failed to create notification' }, { status: 500 });
    }
}