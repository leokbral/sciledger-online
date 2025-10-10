import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    return json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
};