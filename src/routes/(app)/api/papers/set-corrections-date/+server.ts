import { json } from '@sveltejs/kit';
import { db } from '$lib/db/mongo';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { paperId, statusChangedToCorrectionsAt } = await request.json();
        
        if (!paperId || !statusChangedToCorrectionsAt) {
            return json({ 
                success: false, 
                error: 'Missing paperId or statusChangedToCorrectionsAt' 
            }, { status: 400 });
        }
        
        // Update the paper with the fixed date when status changed to "needing corrections"
        // This date should NEVER be updated again, even if the paper is modified
        const result = await db.collection('papers').updateOne(
            { 
                _id: paperId,
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