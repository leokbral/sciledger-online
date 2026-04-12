import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { canManageHub, normalizeId } from '$lib/helpers/hubPermissions';

export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await start_mongo();
    const hubId = params.id;

    try {
        const hub = await Hubs.findById(hubId);
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Hub owner and vice manager can manage reviewers
        if (!canManageHub(hub, locals.user.id)) {
            return json({ error: 'Only hub managers can manage reviewers' }, { status: 403 });
        }

        const { reviewers, action } = await request.json();
        const targetIds: string[] = Array.isArray(reviewers)
            ? reviewers.map((id: any) => normalizeId(id)).filter(Boolean) as string[]
            : [];

        if (!targetIds.length) {
            return json({ error: 'No reviewers provided' }, { status: 400 });
        }

        // Some collections still mix "_id" and "id" values. Expand target keys to both.
        const targetIdSet = new Set(targetIds);
        const matchedUsers = await Users.find({
            $or: [
                { _id: { $in: targetIds } },
                { id: { $in: targetIds } }
            ]
        }).select('_id id').lean();

        for (const userDoc of matchedUsers) {
            const primaryId = normalizeId((userDoc as any)._id);
            const secondaryId = normalizeId((userDoc as any).id);
            if (primaryId) targetIdSet.add(primaryId);
            if (secondaryId) targetIdSet.add(secondaryId);
        }

        const currentUserId = normalizeId(locals.user.id);
        let removedViceManagers: string[] = [];

        switch (action) {
            case 'add':
                // Add new reviewers
                hub.reviewers = [...new Set([...(hub.reviewers || []), ...Array.from(targetIdSet)])];
                break;
            case 'remove':
                // Remove reviewers
                hub.reviewers = (hub.reviewers || []).filter((r: any) => {
                    const id = normalizeId(r);
                    return !id || !targetIdSet.has(id);
                });

                // Keep manager roles in sync: if a removed member is vice manager, drop this role too.
                hub.assistantManagers = (hub.assistantManagers || []).filter((manager: any) => {
                    const id = normalizeId(manager);
                    if (id && targetIdSet.has(id)) {
                        removedViceManagers.push(id);
                        return false;
                    }
                    return true;
                });
                break;
            default:
                return json({ error: 'Invalid action' }, { status: 400 });
        }

        await hub.save();
        const removedCurrentUserAsVice =
            action === 'remove' &&
            !!currentUserId &&
            removedViceManagers.includes(currentUserId);

        return json({ success: true, reviewers: hub.reviewers, removedCurrentUserAsVice, removedViceManagers });

    } catch (error) {
        console.error('Error managing reviewers:', error);
        return json({ error: 'Failed to manage reviewers' }, { status: 500 });
    }
}

export const GET: RequestHandler = async ({ locals, params }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await start_mongo();
    const hubId = params.id;

    try {
        const hub = await Hubs.findById(hubId).populate('reviewers', 'firstName lastName email');
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Hub owner and vice manager can see the full reviewer list
        if (canManageHub(hub, locals.user.id)) {
            return json({ reviewers: hub.reviewers });
        }

        return json({ error: 'Unauthorized to view reviewers' }, { status: 403 });

    } catch (error) {
        console.error('Error fetching reviewers:', error);
        return json({ error: 'Failed to fetch reviewers' }, { status: 500 });
    }
}