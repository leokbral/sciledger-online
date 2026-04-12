import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { canManageHub } from '$lib/helpers/hubPermissions';

export async function POST({ params, request, locals }) {
    try {
        await start_mongo();

        const { reviewerId } = await request.json();
        const { paperId } = params;

        if (!locals.user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar o paper
        const paper = await Papers.findOne({ id: paperId });
        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        // Verificar se o paper já foi publicado
        if (paper.status === 'published') {
            return json({ error: 'Cannot remove reviewers from published papers' }, { status: 400 });
        }

        // Verificar se o usuário é manager do hub (owner ou vice)
        const hub = await Hubs.findById(paper.hubId);
        if (!hub || !canManageHub(hub, locals.user.id)) {
            return json({ error: 'Only hub managers can remove reviewers' }, { status: 403 });
        }

        // Remover o revisor do array
        if (paper.reviewers && paper.reviewers.includes(reviewerId)) {
            paper.reviewers = paper.reviewers.filter(r => r !== reviewerId);
            await paper.save();
            
            console.log(`✅ Reviewer ${reviewerId} removed from paper ${paperId}`);
            console.log(`📋 Remaining reviewers:`, paper.reviewers);

            return json({ 
                success: true, 
                message: 'Reviewer removed successfully',
                reviewers: paper.reviewers
            });
        } else {
            return json({ error: 'Reviewer not found in paper' }, { status: 404 });
        }

    } catch (error) {
        console.error('Error removing reviewer:', error);
        return json({ 
            error: 'Failed to remove reviewer',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
