import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { authorize } from '$lib/server/authorization/authorizationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        await start_mongo();
        const user = locals.user;
        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { paperId, statusChangedToCorrectionsAt } = await request.json();
        
        if (!paperId || !statusChangedToCorrectionsAt) {
            return json({ 
                success: false, 
                error: 'Missing paperId or statusChangedToCorrectionsAt' 
            }, { status: 400 });
        }

        const paper = await Papers.findOne({
            $or: [{ id: String(paperId) }, { _id: String(paperId) }]
        }).lean();

        if (!paper) {
            return json({ success: false, error: 'Paper not found' }, { status: 404 });
        }

        const authorization = await authorize(user, 'paper.requestCorrections', { paper });
        if (!authorization.allowed) {
            return json(
                { error: 'Insufficient permissions', reason: authorization.reason },
                { status: 403 }
            );
        }
        
        // Update the paper with the fixed date when status changed to "needing corrections"
        // This date should NEVER be updated again, even if the paper is modified
        const result = await Papers.updateOne(
            { 
                $or: [{ id: String(paperId) }, { _id: String(paperId) }],
                // Only set this date if it hasn't been set before (prevent overwriting) 
                statusChangedToCorrectionsAt: { $exists: false }
            },
            {
                $set: {
                    statusChangedToCorrectionsAt: new Date(statusChangedToCorrectionsAt)
                }
            }
        );
        
        if (result.matchedCount === 0) {
            // Paper not found or statusChangedToCorrectionsAt already exists
            return json({ 
                success: false, 
                error: 'Paper not found or date already set' 
            }, { status: 404 });
        }
        
        if (result.modifiedCount === 0) {
            // Date was already set, return success anyway
            return json({ 
                success: true, 
                message: 'Date was already set previously' 
            });
        }
        
        return json({ 
            success: true, 
            message: 'Status change date set successfully' 
        });
        
    } catch (error) {
        console.error('Error setting paper status change date:', error);
        return json({ 
            success: false, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
};
