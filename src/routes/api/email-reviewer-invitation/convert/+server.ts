import { json } from '@sveltejs/kit';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { NotificationService } from '$lib/services/NotificationService';
import { start_mongo } from '$lib/db/mongooseConnection';

// Clear cache to ensure we get the updated schema
delete mongoose.models.EmailReviewerInvitation;

const EmailReviewerInvitation = mongoose.model('EmailReviewerInvitation', EmailReviewerInvitationSchema);

// Import models
let Invitation: any;
let Hub: any;

try {
    Invitation = mongoose.model('Invitation');
    Hub = mongoose.model('Hub');
} catch (error) {
    // Models will be loaded from existing connections
}

export async function POST({ request }) {
    try {
        await start_mongo();
        
        const { token, userId } = await request.json();
        
        console.log('Converting invitation - Token:', token, 'UserId:', userId);

        if (!token || !userId) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find the email invitation
        const emailInvitation = await EmailReviewerInvitation.findOne({ 
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!emailInvitation) {
            return json({ error: 'Invalid or expired invitation' }, { status: 404 });
        }

        // Get hub information
        const hub = await Hub.findById(emailInvitation.hubId).populate('createdBy');
        if (!hub) {
            console.error('Hub not found:', emailInvitation.hubId);
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        console.log('Found hub:', hub.title);

        // Check if reviewer invitation already exists
        const existingInvitation = await Invitation.findOne({
            reviewer: userId,
            hubId: emailInvitation.hubId,
            status: 'pending'
        });

        if (existingInvitation) {
            console.log('Invitation already exists, marking email as accepted');
            // Mark email invitation as accepted (converted)
            emailInvitation.status = 'accepted';
            emailInvitation.updatedAt = new Date();
            await emailInvitation.save();
            
            return json({ 
                success: true, 
                message: 'Invitation already exists',
                invitationId: existingInvitation._id 
            });
        }

        // Create a hub reviewer invitation
        const invitationId = crypto.randomUUID();
        const hubInvitation = new Invitation({
            _id: invitationId,
            id: invitationId,
            reviewer: userId,
            hubId: emailInvitation.hubId,
            status: 'pending',
            assignedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await hubInvitation.save();
        console.log('Created hub invitation:', invitationId);

        // Create notification for the user
        const inviterName = hub.createdBy?.firstName 
            ? `${hub.createdBy.firstName} ${hub.createdBy.lastName}`.trim() 
            : 'Hub Admin';
            
        console.log('Creating notification for user:', userId, 'Hub:', hub.title, 'Inviter:', inviterName);
        
        const notification = await NotificationService.createHubInvitationNotification({
            userId: userId,
            hubId: String(emailInvitation.hubId),
            hubName: hub.title,
            inviterName: inviterName,
            role: 'reviewer'
        });

        console.log('Notification created:', notification._id);

        // Mark email invitation as accepted (converted to hub invitation)
        emailInvitation.status = 'accepted';
        emailInvitation.updatedAt = new Date();
        await emailInvitation.save();

        console.log('Email invitation marked as accepted');

        return json({ 
            success: true, 
            message: 'Invitation converted successfully',
            invitationId: hubInvitation._id,
            notificationId: notification._id
        });

    } catch (error) {
        console.error('Error converting invitation:', error);
        return json({ 
            error: 'Failed to convert invitation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
