import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import { Draft } from '$lib/db/schemas/DraftSchema';

export const GET: RequestHandler = async ({ url }) => {
    const paperId = url.searchParams.get('paperId');
    const reviewerId = url.searchParams.get('reviewerId');

    if (!paperId || !reviewerId) {
        return json({ error: 'paperId and reviewerId are required' }, { status: 400 });
    }

    try {
        await start_mongo();
        
        const draft = await Draft.findOne({ paperId, reviewerId });

        return json({ draft: draft || null });
    } catch (error) {
        console.error('Error loading draft:', error);
        return json({ error: 'Failed to load draft' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { paperId, reviewerId, paperTitle, form } = await request.json();

        if (!paperId || !reviewerId) {
            return json({ error: 'paperId and reviewerId are required' }, { status: 400 });
        }

        await start_mongo();

        const draftData = {
            paperId,
            reviewerId,
            paperTitle,
            form,
            updatedAt: new Date()
        };

        // Usa upsert para criar ou atualizar o draft
        const draft = await Draft.findOneAndUpdate(
            { paperId, reviewerId },
            draftData,
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true 
            }
        );

        return json({ 
            success: true, 
            message: 'Draft saved successfully',
            draftId: draft._id
        });
    } catch (error) {
        console.error('Error saving draft:', error);
        return json({ error: 'Failed to save draft' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url }) => {
    const paperId = url.searchParams.get('paperId');
    const reviewerId = url.searchParams.get('reviewerId');

    if (!paperId || !reviewerId) {
        return json({ error: 'paperId and reviewerId are required' }, { status: 400 });
    }

    try {
        await start_mongo();
        
        const result = await Draft.deleteOne({ paperId, reviewerId });

        return json({ 
            success: true, 
            message: result.deletedCount > 0 ? 'Draft deleted successfully' : 'Draft not found'
        });
    } catch (error) {
        console.error('Error deleting draft:', error);
        return json({ error: 'Failed to delete draft' }, { status: 500 });
    }
};