import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import '$lib/db/models/User';
import type { User } from '$lib/types/User';

export const POST: RequestHandler = async ({ request }) => {
    await start_mongo();

    try {
        const data = await request.json();
        
        // Log incoming data for debugging
        console.log('Received data:', data);

        // Validate that id exists
        if (!data.id) {
            return json({ error: 'Paper ID is required.' }, { status: 400 });
        }

        // Validate required fields
        const requiredFields = ['mainAuthor', 'correspondingAuthor', 'title', 'abstract', 'keywords', 'pdfUrl', 'submittedBy'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return json({ 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            }, { status: 400 });
        }

        // Safely handle arrays with optional chaining
        const _coAuthors = data.coAuthors?.map((a: User) => a.id) || [];
        const _authors = data.authors?.map((a: User) => a.id) || [];

        const updateData = {
            mainAuthor: data.mainAuthor?.id,
            authors: _authors,
            paperPictures: data.paperPictures,
            correspondingAuthor: data.correspondingAuthor,
            coAuthors: _coAuthors,
            status: data.status,//'draft', //'under negotiation'
            content: data.content,
            title: data.title,
            abstract: data.abstract,
            keywords: data.keywords,
            pdfUrl: data.pdfUrl,
            submittedBy: data.submittedBy,
            price: data.price || 0,
            peer_review: data.peer_review,
            ...(data.scopusArea && { scopusArea: data.scopusArea }),
            ...(data.scopusSubArea && { scopusSubArea: data.scopusSubArea }),
            updatedAt: new Date().toISOString()
        };

        // Log update data for debugging
        console.log('Update data:', updateData);

        const paper = await Papers.findByIdAndUpdate(
            data.id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                upsert: false // Ensure we don't create a new document
            }
        ).lean().exec();

        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        return json({ paper }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating paper:', error);
        return json({ 
            error: 'Internal server error', 
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
