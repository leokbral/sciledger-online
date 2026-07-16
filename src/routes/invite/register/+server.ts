import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import {
	findEmailReviewerInvitationByToken,
	isEmailReviewerInvitationActive
} from '$lib/server/auth/emailReviewerInvitation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const token = url.searchParams.get('token');

    if (!token) {
        return json({ error: 'Token is required' }, { status: 400 });
    }

    try {
        await start_mongo();

        const invitation = await findEmailReviewerInvitationByToken(token);

        if (!invitation) {
            return json({ error: 'Invalid invitation token' }, { status: 404 });
        }

        if (!isEmailReviewerInvitationActive(invitation)) {
            // Still pending but past its expiry: flag it as expired for visibility
            // in hub-management invite lists. Anything not pending (accepted,
            // declined, already expired) is reported as "already used".
            if (invitation.status === 'pending') {
                invitation.status = 'expired';
                if (typeof invitation.save === 'function') {
                    await invitation.save();
                }
                return json({ error: 'Invitation has expired' }, { status: 410 });
            }
            return json({ error: 'Invitation has already been used' }, { status: 400 });
        }

        return json({
            valid: true,
            email: invitation.email,
            hubId: invitation.hubId,
            paperId: invitation.paperId || null
        });

    } catch (error) {
        console.error('Error validating invitation:', error);
        return json({
            error: 'Failed to validate invitation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};
