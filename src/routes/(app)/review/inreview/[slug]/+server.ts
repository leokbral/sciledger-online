import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import '$lib/db/models/User';
import '$lib/db/models/MessageFeed';
import Papers from '$lib/db/models/Paper';

import MessageFeeds from '$lib/db/models/MessageFeed';

export const POST: RequestHandler = async ({ request }) => {

    await start_mongo();
    try {
        const { newMessage, id } = await request.json();
        if (!newMessage) {
            return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
        }
        const updMessageFeed = await MessageFeeds.findByIdAndUpdate(
            id,
            {
                currentMessage: '',
                $push: {
                    messages: newMessage
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).populate('messages.sender').lean().exec();

        if (!updMessageFeed) {
            throw new Error('newMessage not found');
        }
        console.log(updMessageFeed)
        return json({ updMessageFeed }, { status: 201 });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request, params }) => {
    await start_mongo();

    try {
        const { status } = await request.json();
        const paperId = params.slug; // Change from params.id to params.slug

        if (!status) {
            return json({ error: 'Status is required.' }, { status: 400 });
        }

        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            {
                status: status,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).lean().exec();

        if (!updatedPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        return json({ success: true, paper: updatedPaper }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating paper status:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
