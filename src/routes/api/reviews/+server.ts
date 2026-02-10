import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Reviews from '$lib/db/models/Review';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { NotificationService } from '$lib/services/NotificationService';
import * as crypto from 'crypto';
import { start_mongo } from '$lib/db/mongooseConnection';

/**
 * Verifica se todos os revisores completaram a rodada de revisão e atualiza o status do paper
 * Se todos completaram a rodada 1, muda para 'needing corrections'
 * Se todos completaram a rodada 2, muda para 'needing corrections'
 */
async function checkAndUpdatePaperStatusIfAllReviewsComplete(paperId: string, reviewRound: number) {
	try {
		const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;
		
		// Buscar todos os ReviewAssignments para este paper.
		// Importante: manter 'completed' aqui para que a 2ª rodada funcione mesmo que
		// o assignment já tenha sido marcado como completed na 1ª rodada.
		const assignedReviewers = await ReviewAssignment.find({
			paperId,
			status: { $in: ['accepted', 'pending', 'completed', 'overdue'] }
		});

		if (assignedReviewers.length === 0) {
			console.log(`📋 No assigned reviewers found for paper ${paperId}`);
			return;
		}

		// Buscar todas as revisões submetidas nesta rodada
		const submittedReviews = await Reviews.find({
			paperId,
			reviewRound,
			status: 'submitted'
		});

		console.log(`📋 [Review Check] Paper ${paperId}: ${submittedReviews.length}/${assignedReviewers.length} reviewers completed round ${reviewRound}`);

		// Se o número de revisões submetidas = número de revisores atribuídos
		if (submittedReviews.length === assignedReviewers.length) {
			const paper = await Papers.findOne({ id: paperId });
			if (!paper) return;

			let newStatus = '';
			if (reviewRound === 1 && paper.status === 'in review') {
				newStatus = 'needing corrections';
			} else if (reviewRound === 2 && paper.status === 'in review') {
				newStatus = 'needing corrections';
			} else if (reviewRound === 3 && paper.status === 'under final review') {
				newStatus = 'awaiting final decision';
			}

			if (newStatus) {
				paper.status = newStatus;
				await paper.save();
				console.log(`✅ [Status Update] Paper ${paperId} status changed to: ${newStatus}`);
			}
		}
	} catch (error) {
		console.error('Error checking review completion status:', error);
	}
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		await start_mongo();
		
		const paperId = url.searchParams.get('paperId');
		const reviewerId = url.searchParams.get('reviewerId');
		const reviewRound = url.searchParams.get('reviewRound');
		
		if (!paperId || !reviewerId || !reviewRound) {
			return json({ error: 'Missing required parameters' }, { status: 400 });
		}
		
		// Buscar revisão enviada nesta rodada
		const review = await Reviews.findOne({
			paperId,
			reviewerId,
			reviewRound: parseInt(reviewRound),
			status: 'submitted'
		});
		
		if (review) {
			return json({
				hasSubmitted: true,
				review: {
					form: {
						originality: review.quantitativeEvaluation.originality,
						clarity: review.quantitativeEvaluation.clarity,
						literatureReview: review.quantitativeEvaluation.literatureReview,
						theoreticalFoundation: review.quantitativeEvaluation.theoreticalFoundation,
						methodology: review.quantitativeEvaluation.methodology,
						reproducibility: review.quantitativeEvaluation.reproducibility,
						results: review.quantitativeEvaluation.results,
						figures: review.quantitativeEvaluation.figures,
						limitations: review.quantitativeEvaluation.limitations,
						language: review.quantitativeEvaluation.language,
						impact: review.quantitativeEvaluation.impact,
						strengths: review.qualitativeEvaluation.strengths,
						weaknesses: review.qualitativeEvaluation.weaknesses,
						involvesHumanResearch: review.ethics.involvesHumanResearch,
						ethicsApproval: review.ethics.ethicsApproval,
						recommendation: review.recommendation
					},
					submissionDate: review.submissionDate,
					weightedScore: review.weightedScore
				}
			});
		}
		
		return json({ hasSubmitted: false });
	} catch (error) {
		console.error('Error checking review:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		await start_mongo();

		const reviewData = await request.json();
		const { paperId, reviewerId, paperTitle, form, reviewRound } = reviewData;

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

		// Determinar a rodada baseada no paper.reviewRound ou no reviewRound enviado
		let actualRound = reviewRound || paper.reviewRound || 1;

		// Verificar se já existe uma revisão submetida nesta rodada
		const existingReview = await Reviews.findOne({
			paperId,
			reviewerId,
			reviewRound: actualRound,
			status: 'submitted'
		});

		if (existingReview) {
			return json({ error: `You have already submitted a review for this round (Round ${actualRound})` }, { status: 400 });
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
			reviewRound: actualRound,
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

		// Buscar informações para as notificações
		const reviewer = await Users.findOne({ id: reviewerId });
		const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'Revisor';
		const authorId = typeof paper.mainAuthor === 'string' ? paper.mainAuthor : String(paper.mainAuthor);
		const submittedById = typeof paper.submittedBy === 'string' ? paper.submittedBy : String(paper.submittedBy);

		// Criar notificações para quando revisor finaliza a revisão
		try {
			await NotificationService.createReviewSubmittedNotifications({
				paperId: paper.id,
				paperTitle: paper.title,
				reviewId: reviewId,
				reviewerId: reviewerId,
				reviewerName: reviewerName,
				authorId: authorId,
				editorId: submittedById, // usando submittedBy como fallback para editor
				reviewDecision: form.recommendation as 'accept' | 'reject' | 'minor_revision' | 'major_revision',
				hubId: typeof paper.hubId === 'string' ? paper.hubId : undefined
			});
		} catch (notificationError) {
			console.error('Error creating review notifications:', notificationError);
			// Não falhar a operação principal por causa das notificações
		}

		// Verificar se todos os revisores completaram a rodada e atualizar status se necessário
		await checkAndUpdatePaperStatusIfAllReviewsComplete(paperId, actualRound);

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
