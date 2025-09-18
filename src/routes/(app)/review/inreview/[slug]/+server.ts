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
        const { reviewerId } = await request.json();
        const paperId = params.slug;

        if (!reviewerId) {
            return json({ error: 'Reviewer ID is required.' }, { status: 400 });
        }

        // Atualiza o status da revisão individual para 'completed'
        const paper = await Papers.findOne({ id: paperId }).lean().exec();
        if (!paper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        // Atualiza a resposta do revisor para 'completed'
        const responses = paper.peer_review?.responses?.map((resp) => {
            if (resp.reviewerId === reviewerId) {
                return { ...resp, status: 'completed', completedAt: new Date() };
            }
            return resp;
        }) ?? [];

        // Verifica se todos os revisores que ACEITARAM completaram
        const acceptedReviewers = responses.filter(r => r.status === 'accepted' || r.status === 'completed');
        const completedReviewers = responses.filter(r => r.status === 'completed');
        const allAcceptedCompleted = acceptedReviewers.length > 0 && acceptedReviewers.length === completedReviewers.length;

        // Atualiza o status do artigo se todos que aceitaram completaram
        const newStatus = allAcceptedCompleted ? 'needing corrections' : paper.status;

        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            {
                'peer_review.responses': responses,
                status: newStatus,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).lean().exec();

        return json({ success: true, paper: updatedPaper }, { status: 200 });
    } catch (error) {
        console.error('Error updating paper status:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
