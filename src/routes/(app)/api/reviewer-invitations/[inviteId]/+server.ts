import Invitation from '$lib/db/models/Invitation';
import { json } from '@sveltejs/kit';

export async function POST({ params, request, fetch }) {
    try {
        const { action } = await request.json();
        const { inviteId } = params;

        const invitation = await Invitation.findById(inviteId);
       
        if (!invitation) {
            return json({ error: 'Invitation not found' }, { status: 404 });
        }

        invitation.status = action === 'accept' ? 'accepted' : 'declined';
        invitation.respondedAt = new Date();
        const saveRes = await invitation.save();

        console.log('Invitation updated:', saveRes);

        if (action === 'accept') {
            // Add reviewer to hub's reviewers array
            const response = await fetch(`/api/hub/${invitation.hubId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewerId: invitation.reviewer })
            });

            if (!response.ok) {
                throw new Error('Failed to add reviewer to hub');
            }

        }
            
            await Invitation.findByIdAndDelete(inviteId);
            console.log('Invitation deleted:', inviteId);

        return json({ success: true });
    } catch (error) {
        console.error('Error processing invitation response:', error);
        return json({ error: 'Failed to process invitation' }, { status: 500 });
    }
}