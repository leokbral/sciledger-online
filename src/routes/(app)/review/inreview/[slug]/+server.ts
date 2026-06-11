import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import '$lib/db/models/User';
import '$lib/db/models/MessageFeed';
import Papers from '$lib/db/models/Paper';

import MessageFeeds from '$lib/db/models/MessageFeed';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
    EditorialTransitionError,
    transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';
import { getUserIdAliases } from '$lib/server/authorization/roleResolver';

export const POST: RequestHandler = async ({ request, locals }) => {

    await start_mongo();
    try {
        if (!locals.user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

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
        return json({ updMessageFeed }, { status: 201 });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
    await start_mongo();

    try {
        const user = locals.user;
        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { reviewerId } = await request.json();
        const paperId = params.slug;

        if (!reviewerId) {
            return json({ error: 'Reviewer ID is required.' }, { status: 400 });
        }

        if (!getUserIdAliases(user).includes(String(reviewerId))) {
            return json({ error: 'Reviewer mismatch' }, { status: 403 });
        }

        // Atualiza o status da revisão individual para 'completed'
        const paper = await Papers.findOne({ id: paperId }).lean().exec();
        if (!paper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        const authorization = await authorize(user, 'review.submit', { paper });
        if (!authorization.allowed) {
            return json(
                { error: 'Insufficient permissions', reason: authorization.reason },
                { status: 403 }
            );
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

        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            {
                'peer_review.responses': responses,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).lean().exec();

        let responsePaper = updatedPaper;
        if (allAcceptedCompleted && paper.status === 'in review') {
            try {
                responsePaper = await transitionPaperStatus({
                    paperId,
                    action: 'paper.autoRequestCorrections',
                    expectedStatus: 'in review',
                    system: true,
                    metadata: {
                        endpoint: '/review/inreview/[slug]',
                        trigger: 'all_accepted_reviewers_completed'
                    }
                });
            } catch (transitionError) {
                if (transitionError instanceof EditorialTransitionError) {
                    console.warn('In-review completion transition skipped:', transitionError.message);
                } else {
                    throw transitionError;
                }
            }
        }

        return json({ success: true, paper: responsePaper }, { status: 200 });
    } catch (error) {
        console.error('Error updating paper status:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
