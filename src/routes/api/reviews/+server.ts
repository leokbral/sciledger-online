import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Reviews from '$lib/db/models/Review';
import Papers from '$lib/db/models/Paper';
import * as crypto from 'crypto';
import { start_mongo } from '$lib/db/mongooseConnection';

export const POST: RequestHandler = async ({ request }) => {
	try {
		await start_mongo();

		const reviewData = await request.json();
		const { paperId, reviewerId, paperTitle, form } = reviewData;

		// Validar dados obrigatórios
		if (!paperId || !reviewerId || !paperTitle || !form) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Verificar se o paper existe
		const paper = await Papers.findOne({ id: paperId });
		if (!paper) {
            console.log('Paper not found:', paperId);
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		// Calcular weighted score
		const weights = {
			originality: 0.15,
			clarity: 0.08,
			literatureReview: 0.07,
			theoreticalFoundation: 0.08,
			methodology: 0.15,
			reproducibility: 0.07,
			results: 0.15,
			figures: 0.05,
			limitations: 0.05,
			language: 0.05,
			impact: 0.10
		};

		let weightedScore = 0;
		let totalWeight = 0;

		for (const key in weights) {
			const score = form[key] || 0;
			const weight = weights[key as keyof typeof weights];
			if (score > 0) {
				weightedScore += score * weight;
				totalWeight += weight;
			}
		}

		weightedScore = totalWeight > 0 ? Number((weightedScore / totalWeight).toFixed(2)) : 0;

		// Criar nova revisão
		const reviewId = crypto.randomUUID();
		const review = new Reviews({
			_id: reviewId,
			id: reviewId,
			paperId,
			reviewerId,
			paperTitle,
			quantitativeEvaluation: {
				originality: form.originality || 0,
				clarity: form.clarity || 0,
				literatureReview: form.literatureReview || 0,
				theoreticalFoundation: form.theoreticalFoundation || 0,
				methodology: form.methodology || 0,
				reproducibility: form.reproducibility || 0,
				results: form.results || 0,
				figures: form.figures || 0,
				limitations: form.limitations || 0,
				language: form.language || 0,
				impact: form.impact || 0
			},
			qualitativeEvaluation: {
				strengths: form.strengths || '',
				weaknesses: form.weaknesses || ''
			},
			ethics: {
				involvesHumanResearch: form.involvesHumanResearch || '',
				ethicsApproval: form.ethicsApproval || ''
			},
			recommendation: form.recommendation || '',
			weightedScore,
			status: 'submitted',
			submissionDate: new Date(),
			completionDate: new Date()
		});

		// Salvar a revisão
		await review.save();

		// Inicializar peer_review se necessário
		if (!paper.peer_review) {
			paper.peer_review = {
				reviewType: 'open',
				assignedReviewers: [],
				responses: [],
				reviews: [],
				averageScore: 0,
				reviewCount: 0,
				reviewStatus: 'not_started'
			};
		}

		// Adicionar a revisão ao paper
		paper.peer_review.reviews.push(review);
		paper.peer_review.reviewCount = paper.peer_review.reviews.length;
		paper.peer_review.reviewStatus = 'in_progress';

		// Recalcular a média das revisões submetidas
		const allReviews = await Reviews.find({
			paperId: paperId,
			status: 'submitted'
		});

		if (allReviews.length > 0) {
			const totalScore = allReviews.reduce((sum, rev) => sum + (rev.weightedScore || 0), 0);
			paper.peer_review.averageScore = Number((totalScore / allReviews.length).toFixed(2));
		}

		// Verificar se todas as revisões foram completadas
		if (
			paper.peer_review.reviewType === 'selected' &&
			paper.peer_review.reviews.length >= paper.peer_review.assignedReviewers.length
		) {
			paper.peer_review.reviewStatus = 'completed';
		}

		await paper.save();

		return json(
			{
				success: true,
				reviewId,
				message: 'Review submitted successfully'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error saving review:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
