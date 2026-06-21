import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import '$lib/db/models/User';
import '$lib/db/models/MessageFeed';
import '$lib/db/models/Paper';
import { emitPaperLifecycleEvent } from '$lib/server/paperLifecycleEvents';
import MessageFeeds from '$lib/db/models/MessageFeed';
import Papers from '$lib/db/models/Paper';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	await start_mongo();

	try {
		const body = await request.json();

		if (body.action === 'saveCorrectionProgress') {
			const { correctionProgress } = body;
			const paperId = params.slug;

			if (!correctionProgress || !paperId) {
				return json({ error: 'correctionProgress e paperId sao obrigatorios.' }, { status: 400 });
			}

			const updatedPaper = await Papers.findOneAndUpdate(
				{ id: paperId },
				{
					correctionProgress: new Map(Object.entries(correctionProgress)),
					updatedAt: new Date().toISOString()
				},
				{
					new: true,
					runValidators: true
				}
			)
				.lean()
				.exec();

			if (!updatedPaper) {
				return json({ error: 'Paper nao encontrado.' }, { status: 404 });
			}

			const existingProgress = updatedPaper.correctionProgress || {};
			const newProgressEntries = Object.entries(correctionProgress);
			const completedCorrections = newProgressEntries.filter(([, completed]) => completed).length;
			const hasSignificantProgress =
				completedCorrections > Object.keys(existingProgress).length * 0.5;

			if (hasSignificantProgress) {
				try {
					const requiresNewReview = completedCorrections > 0.8 * newProgressEntries.length;
					await emitPaperLifecycleEvent('paper.corrections_submitted', updatedPaper, {
						actorId: locals.user?.id || null,
						metadata: {
							endpoint: '/publish/corrections/[slug]',
							correctionVersion: 1,
							completedCorrections,
							totalCorrections: newProgressEntries.length,
							requiresNewReview,
							correctionReason: requiresNewReview ? 'new_review_required' : undefined
						}
					});
				} catch (eventError) {
					console.error('Error emitting correction event:', eventError);
				}
			}

			const responseProgress =
				updatedPaper.correctionProgress instanceof Map
					? Object.fromEntries(updatedPaper.correctionProgress)
					: updatedPaper.correctionProgress || {};

			return json(
				{
					success: true,
					correctionProgress: responseProgress
				},
				{ status: 200 }
			);
		}

		const { newMessage, id } = body;
		if (!newMessage) {
			return json({ error: 'Todos os campos sao obrigatorios.' }, { status: 400 });
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
		)
			.populate('messages.sender')
			.lean()
			.exec();

		if (!updMessageFeed) {
			throw new Error('newMessage not found');
		}

		return json({ updMessageFeed }, { status: 201 });
	} catch (error) {
		console.error('Erro ao processar requisicao:', error);
		return json({ error: 'Erro interno do servidor.' }, { status: 500 });
	}
};
