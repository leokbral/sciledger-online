import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    return json({
        message: 'Notification API is working!',
        endpoints: [
            'GET /api/notifications - List notifications',
            'GET /api/notifications/unread-count - Get unread count',
            'POST /api/notifications/mark-all-read - Mark all as read',
            'POST /api/notifications/[id]/read - Mark specific as read',
            'DELETE /api/notifications/[id] - Delete notification'
        ],
        timestamp: new Date().toISOString()
    });
};