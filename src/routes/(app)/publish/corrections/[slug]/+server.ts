import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import '$lib/db/models/User';
import '$lib/db/models/Paper';
import { emitPaperLifecycleEvent } from '$lib/server/paperLifecycleEvents';
import MessageFeeds from '$lib/db/models/MessageFeed';
import Papers from '$lib/db/models/Paper';
import { authorize } from '$lib/server/authorization/authorizationService';
import sanitizeHtml from 'sanitize-html';

export const GET: RequestHandler = async ({ params, locals }) => {
	await start_mongo();
	if (!locals.user) return json({ error: 'User not authenticated' }, { status: 401 });

	const paper = await Papers.findOne({ id: params.slug }).lean().exec();
	if (!paper) return json({ error: 'Paper not found' }, { status: 404 });
	const authorization = await authorize(locals.user, 'paper.edit', { paper });
	if (!authorization.allowed) return json({ error: 'Insufficient permissions' }, { status: 403 });

	return json({
		responseToReviewers: paper.responseToReviewers || '',
		version: paper.responseToReviewersVersion ?? 0
	});
};

export const POST: RequestHandler = async ({ request, params, locals }) => {
	await start_mongo();

	try {
		const body = await request.json();

		if (body.action === 'saveResponseToReviewers') {
			if (!locals.user) {
				return json({ error: 'User not authenticated' }, { status: 401 });
			}
			if (typeof body.responseToReviewers !== 'string' || body.responseToReviewers.length > 100_000) {
				return json({ error: 'Response to Reviewers must be text under 100 KB.' }, { status: 400 });
			}
			if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0) {
				return json({ error: 'A valid response version is required.' }, { status: 400 });
			}

			const paper = await Papers.findOne({ id: params.slug }).lean().exec();
			if (!paper) return json({ error: 'Paper not found' }, { status: 404 });
			const authorization = await authorize(locals.user, 'paper.edit', { paper });
			if (!authorization.allowed) {
				return json({ error: 'Insufficient permissions' }, { status: 403 });
			}
			if (paper.status !== 'needing corrections' && paper.status !== 'under correction') {
				return json({ error: 'The paper is no longer in the corrections phase.' }, { status: 409 });
			}

			const responseToReviewers = sanitizeHtml(body.responseToReviewers, {
				allowedTags: ['p', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'code', 'a', 'br'],
				allowedAttributes: { a: ['href', 'target'] },
				allowedSchemes: ['http', 'https', 'mailto']
			}).trim();
			const currentVersion = paper.responseToReviewersVersion ?? 0;
			if (responseToReviewers === (paper.responseToReviewers || '')) {
				return json({ responseToReviewers, version: currentVersion });
			}
			if (body.expectedVersion !== currentVersion) {
				return json({
					error: 'Response to Reviewers changed in another tab.',
					responseToReviewers: paper.responseToReviewers || '',
					version: currentVersion
				}, { status: 409 });
			}
			const versionFilter = currentVersion === 0
				? { $or: [{ responseToReviewersVersion: 0 }, { responseToReviewersVersion: { $exists: false } }] }
				: { responseToReviewersVersion: currentVersion };
			const updatedPaper = await Papers.findOneAndUpdate(
				{ id: params.slug, status: { $in: ['needing corrections', 'under correction'] }, ...versionFilter },
				{ $set: { responseToReviewers, updatedAt: new Date().toISOString() }, $inc: { responseToReviewersVersion: 1 } },
				{ new: true }
			).select('responseToReviewers responseToReviewersVersion').lean().exec();
			if (!updatedPaper) {
				const latest = await Papers.findOne({ id: params.slug }).lean().exec();
				return json({
					error: 'Response to Reviewers changed in another tab or the paper left corrections.',
					responseToReviewers: latest?.responseToReviewers || '',
					version: latest?.responseToReviewersVersion ?? 0
				}, { status: 409 });
			}
			return json({
				responseToReviewers: updatedPaper.responseToReviewers,
				version: updatedPaper.responseToReviewersVersion ?? 0
			});
		}

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
