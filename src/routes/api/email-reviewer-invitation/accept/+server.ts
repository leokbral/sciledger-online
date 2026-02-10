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

export const POST: RequestHandler = async ({ request }) => {
    try {
        await start_mongo();
        
        const { token, userId } = await request.json();

        if (!token || !userId) {
            return json({ error: 'Token and userId are required' }, { status: 400 });
        }

        const invitation = await EmailReviewerInvitation.findOne({ token });

        if (!invitation) {
            return json({ error: 'Invalid invitation' }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return json({ error: 'Invitation has already been used' }, { status: 400 });
        }

        if (new Date() > new Date(invitation.expiresAt)) {
            invitation.status = 'expired';
            await invitation.save();
            return json({ error: 'Invitation has expired' }, { status: 410 });
        }

        // Mark invitation as accepted
        invitation.status = 'accepted';
        invitation.updatedAt = new Date();
        await invitation.save();

        return json({ 
            message: 'Invitation accepted successfully',
            hubId: invitation.hubId
        });

    } catch (error) {
        console.error('Error accepting invitation:', error);
        return json({ 
            error: 'Failed to accept invitation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};
