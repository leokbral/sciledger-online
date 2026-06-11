import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';
import { authorize } from '$lib/server/authorization/authorizationService';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';
import { assignHighestHubRole } from '$lib/server/authorization/roleAssignmentService';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        await start_mongo();
        if (!locals.user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }
        
        const { hubId, userId } = await request.json();

        if (!hubId || !userId) {
            return json({ error: 'hubId and userId are required' }, { status: 400 });
        }

        const hub = await Hubs.findById(hubId);
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        const authorization = await authorize(locals.user, 'hub.manageMembers', { hub });
        if (!authorization.allowed) {
            return json(
                { error: 'Insufficient permissions', reason: authorization.reason },
                { status: 403 }
            );
        }

        await assignHighestHubRole(userId, hubId, 'Reviewer', locals.user.id, {
            auditUser: locals.user
        });

        const effectiveRoles = await resolveEffectiveHubRoles(hub);

        return json({ 
            success: true, 
            message: 'Reviewer added to hub successfully',
            reviewers: effectiveRoles.reviewers 
        });

    } catch (error) {
        console.error('Error adding reviewer to hub:', error);
        return json({ 
            error: 'Failed to add reviewer to hub',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
