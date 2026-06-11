import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import '$lib/db/models/User';
import type { User } from '$lib/types/User';
import Hubs from '$lib/db/models/Hub';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const {
			id,
			mainAuthor,
			correspondingAuthor,
			title,
			abstract,
			keywords,
			pdfUrl,
			submittedBy,
			price,
			coAuthors,
			status,
			authors,
			peer_review,
			selectedReviewers,
			paperPictures,
			hubId,
			isLinkedToHub
		} = await request.json();

		const existingPaper = await Papers.findById(id).lean().exec();
		if (!existingPaper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const authorization = await authorize(user, 'paper.assignReviewers', { paper: existingPaper });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}

		if (!mainAuthor || !correspondingAuthor || !title || !abstract || !keywords || !pdfUrl || !submittedBy) {
			return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
		}

		const _coAuthors = coAuthors.map((a: User) => a.id);
		const _authors = authors.map((a: User) => a.id);
		const previousStatus = String((existingPaper as any).status || '');
		const requestedStatus = String(status || previousStatus);
		const shouldSendToReview =
			previousStatus === 'reviewer assignment' && requestedStatus === 'in review';

		if (requestedStatus !== previousStatus && !shouldSendToReview) {
			return json(
				{ error: 'Status changes must use the editorial transition endpoints.' },
				{ status: 400 }
			);
		}

		let paper: any = await Papers.findByIdAndUpdate(
			id,
			{
				mainAuthor: mainAuthor.id,
				authors: _authors,
				correspondingAuthor,
				coAuthors: _coAuthors,
				status: shouldSendToReview ? previousStatus : requestedStatus,
				title,
				abstract,
				keywords,
				pdfUrl,
				submittedBy,
				price,
				peer_review,
				selectedReviewers,
				paperPictures,
				hubId: hubId ?? null,
				isLinkedToHub: !!hubId && isLinkedToHub === true,
				updatedAt: new Date().toISOString()
			},
			{ new: true, runValidators: true }
		)
			.lean()
			.exec();

		if (!paper) {
			throw new Error('Paper not found');
		}

		if (shouldSendToReview) {
			paper = await transitionPaperStatus({
				user,
				paperId: id,
				action: 'paper.sendToReview',
				expectedStatus: previousStatus,
				metadata: {
					endpoint: '/publish/negotiation/[slug]'
				}
			});
		}

		// Se foi vinculado a um hub, atualiza o hub também
		if (hubId && isLinkedToHub === true) {
			await Hubs.findByIdAndUpdate(
				hubId,
				{ $addToSet: { submittedPapers: paper._id } }, // evita duplicação
				{ new: true }
			).exec();
		}

		return json({ paper }, { status: 201 });
	} catch (error) {
		if (error instanceof EditorialTransitionError) {
			return json(
				{
					error: error.message,
					code: error.code,
					currentStatus: error.currentStatus
				},
				{ status: error.status }
			);
		}
		console.error('Erro ao registrar paper:', error);
		return json({ error: 'Erro interno do servidor.' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, params }) => {
	await start_mongo();

	try {
		const { paperPictures } = await request.json();
		const paperId = params.slug;

		const paper = await Papers.findByIdAndUpdate(
			paperId,
			{ $set: { paperPictures } },
			{ new: true, runValidators: true }
		)
			.lean()
			.exec();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		return json({ success: true, paper }, { status: 200 });
	} catch (error) {
		console.error('Error updating paper images:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	await start_mongo();

	try {
		const { imageId } = await request.json();
		const paperId = params.slug;

		const paper = await Papers.findByIdAndUpdate(
			paperId,
			{ $pull: { paperPictures: imageId } },
			{ new: true, runValidators: true }
		)
			.lean()
			.exec();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		return json({ success: true, paper }, { status: 200 });
	} catch (error) {
		console.error('Error deleting paper image:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async () => {
	await start_mongo();

	try {
		const hubs = await Hubs.find({ status: 'open' })
			.select('id title type description cardUrl logoUrl status')
			.lean()
			.exec();

		return json({
			success: true,
			hubs
		});
	} catch (error) {
		console.error('Error fetching hubs:', error);
		return json(
			{
				success: false,
				message: 'Failed to fetch hubs'
			},
			{ status: 500 }
		);
	}
};
