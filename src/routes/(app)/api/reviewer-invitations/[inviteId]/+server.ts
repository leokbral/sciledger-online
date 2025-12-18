import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { json } from '@sveltejs/kit';
import { NotificationService } from '$lib/services/NotificationService';
import { start_mongo } from '$lib/db/mongooseConnection';

export async function POST({ params, request, locals }) {
    await start_mongo();
    
    try {
        const { action } = await request.json();
        const { inviteId } = params;

        const invitation = await Invitation.findById(inviteId).populate('hubId');
       
        if (!invitation) {
            return json({ error: 'Invitation not found' }, { status: 404 });
        }

        // Get hub and reviewer information
        const hub = await Hubs.findById(invitation.hubId);
        const reviewer = await Users.findById(invitation.reviewer);
        
        if (!hub || !reviewer) {
            return json({ error: 'Hub or reviewer not found' }, { status: 404 });
        }

        invitation.status = action === 'accept' ? 'accepted' : 'declined';
        invitation.respondedAt = new Date();
        const saveRes = await invitation.save();

        console.log('Invitation updated:', saveRes);

        const reviewerName = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email;

        if (action === 'accept') {
            // Add reviewer to hub's reviewers array
            if (!hub.reviewers) {
                hub.reviewers = [];
            }
            if (!hub.reviewers.includes(String(invitation.reviewer))) {
                hub.reviewers.push(String(invitation.reviewer));
                await hub.save();
            }

            // Notify hub creator that reviewer accepted
            await NotificationService.createNotification({
                user: String(hub.createdBy),
                type: 'hub_reviewer_accepted',
                title: 'Reviewer Accepted Invitation',
                content: `${reviewerName} has accepted the invitation to review for "${hub.title}"`,
                relatedHubId: String(invitation.hubId),
                actionUrl: `/notifications`,
                priority: 'medium',
                metadata: {
                    reviewerName: reviewerName,
                    reviewerId: String(invitation.reviewer),
                    hubName: hub.title
                }
            });
        } else {
            // Notify hub creator that reviewer declined
            await NotificationService.createNotification({
                user: String(hub.createdBy),
                type: 'hub_reviewer_declined',
                title: 'Reviewer Declined Invitation',
                content: `${reviewerName} has declined the invitation to review for "${hub.title}"`,
                relatedHubId: String(invitation.hubId),
                actionUrl: `/notifications`,
                priority: 'low',
                metadata: {
                    reviewerName: reviewerName,
                    reviewerId: String(invitation.reviewer),
                    hubName: hub.title
                }
            });
        }
            
        await Invitation.findByIdAndDelete(inviteId);
        console.log('Invitation deleted:', inviteId);

        return json({ success: true });
    } catch (error) {
        console.error('Error processing invitation response:', error);
        return json({ error: 'Failed to process invitation' }, { status: 500 });
    }
}