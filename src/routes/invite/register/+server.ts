import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import type { RequestHandler } from './$types';

// Clear the model cache to ensure we use the updated schema
if (mongoose.models.EmailReviewerInvitation) {
    delete mongoose.models.EmailReviewerInvitation;
}

const EmailReviewerInvitation = mongoose.model('EmailReviewerInvitation', EmailReviewerInvitationSchema);

export const GET: RequestHandler = async ({ url }) => {
    const token = url.searchParams.get('token');
    
    if (!token) {
        return json({ error: 'Token is required' }, { status: 400 });
    }

    try {
        await start_mongo();
        
        const invitation = await EmailReviewerInvitation.findOne({ token });
        
        if (!invitation) {
            return json({ error: 'Invalid invitation token' }, { status: 404 });
        }

        // Check if expired
        if (new Date() > new Date(invitation.expiresAt)) {
            invitation.status = 'expired';
            await invitation.save();
            return json({ error: 'Invitation has expired' }, { status: 410 });
        }

        // Check if already accepted
        if (invitation.status !== 'pending') {
            return json({ error: 'Invitation has already been used' }, { status: 400 });
        }

        return json({
            valid: true,
            email: invitation.email,
            hubId: invitation.hubId
        });

    } catch (error) {
        console.error('Error validating invitation:', error);
        return json({ 
            error: 'Failed to validate invitation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};
