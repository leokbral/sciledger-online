import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import '$lib/db/models/User';

export const GET: RequestHandler = async ({ params, locals }) => {
    await start_mongo();

    try {
        if (!locals.user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const paperId = params.slug;

        // Busca paper que foi revisado pelo usuário atual e está publicado
        const paper = await Papers.findOne({
            id: paperId,
            status: 'published',
            'peer_review.responses': {
                $elemMatch: {
                    reviewerId: locals.user.id,
                    status: 'completed'
                }
            }
        })
        .populate("authors")
        .populate("mainAuthor")
        .populate("coAuthors")
        .lean()
        .exec();

        if (!paper) {
            return json({ error: 'Published paper not found or you did not review this paper' }, { status: 404 });
        }

        return json({ success: true, paper }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching published reviewed paper:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
