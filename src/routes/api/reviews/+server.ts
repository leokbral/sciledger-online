import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Reviews from '$lib/db/models/Review';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { NotificationService } from '$lib/services/NotificationService';
import {
	createReviewerTransfer,
	getConnectedAccountStatus,
	getReviewerPayoutAmountCents,
	getStripeClient
} from '$lib/services/stripeConnect';
import {
	isReviewAttachmentFile,
	saveReviewAttachmentFile,
	validateReviewAttachmentFile
} from '$lib/server/reviewAttachment';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';
import { getUserIdAliases } from '$lib/server/authorization/roleResolver';
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
			return;
		}

		// Buscar todas as revisões submetidas nesta rodada
		const submittedReviews = await Reviews.find({
			paperId,
			reviewRound,
			status: 'submitted'
		});

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
				try {
					await transitionPaperStatus({
						paperId,
						action: 'paper.autoRequestCorrections',
						expectedStatus: paper.status,
						system: true,
						metadata: {
							reviewRound,
							submittedReviews: submittedReviews.length,
							assignedReviewers: assignedReviewers.length
						}
					});
				} catch (transitionError) {
					if (transitionError instanceof EditorialTransitionError) {
						console.warn('Review completion transition skipped:', transitionError.message);
						return;
					}
					throw transitionError;
				}
			}
		}
	} catch (error) {
		console.error('Error checking review completion status:', error);
	}
}

function normalizeReviewerPayments(input: any) {
	return {
		stripeConnectAccountId: input?.stripeConnectAccountId ?? '',
		onboardingComplete: !!input?.onboardingComplete,
		detailsSubmitted: !!input?.detailsSubmitted,
		chargesEnabled: !!input?.chargesEnabled,
		payoutsEnabled: !!input?.payoutsEnabled,
		defaultCurrency: input?.defaultCurrency ?? 'brl',
		totalEarnedCents: Number(input?.totalEarnedCents ?? 0),
		totalPaidOutCents: Number(input?.totalPaidOutCents ?? 0),
		pendingPayoutCents: Number(input?.pendingPayoutCents ?? 0),
		onboardingStartedAt: input?.onboardingStartedAt,
		onboardingCompletedAt: input?.onboardingCompletedAt,
		lastPayoutAt: input?.lastPayoutAt
	};
}

async function tryProcessReviewerPayout(
	paper: any,
	reviewerId: string,
	reviewId: string,
	reviewRound: number
) {
	if (reviewRound !== 2) {
		return;
	}

	const reviewerResponse = paper.peer_review?.responses?.find(
		(r: any) => String(r?.reviewerId) === reviewerId
	);

	if (!reviewerResponse) {
		return;
	}

	if (reviewerResponse.payoutStatus === 'paid' && reviewerResponse.payoutTransferId) {
		return;
	}

	const payoutAmount = getReviewerPayoutAmountCents();
	const reviewerDoc: any = await Users.findOne({ id: reviewerId });
	if (!reviewerDoc) {
		reviewerResponse.payoutStatus = 'failed';
		reviewerResponse.payoutFailureReason = 'Reviewer not found';
		reviewerResponse.payoutAmount = payoutAmount;
		await paper.save();
		return;
	}

	const payments = normalizeReviewerPayments(reviewerDoc.reviewerPayments);
	const stripe = getStripeClient();

	if (!stripe) {
		reviewerResponse.payoutStatus = 'failed';
		reviewerResponse.payoutFailureReason = 'Stripe is not configured on the server';
		reviewerResponse.payoutAmount = payoutAmount;
		payments.pendingPayoutCents += payoutAmount;
		reviewerDoc.reviewerPayments = payments;
		await reviewerDoc.save();
		await paper.save();
		return;
	}

	if (!payments.stripeConnectAccountId) {
		reviewerResponse.payoutStatus = 'pending_connect';
		reviewerResponse.payoutFailureReason = 'Reviewer Stripe account is not connected';
		reviewerResponse.payoutAmount = payoutAmount;
		payments.pendingPayoutCents += payoutAmount;
		reviewerDoc.reviewerPayments = payments;
		await reviewerDoc.save();
		await paper.save();
		return;
	}

	const accountStatus = await getConnectedAccountStatus(stripe, payments.stripeConnectAccountId);
	payments.detailsSubmitted = accountStatus.detailsSubmitted;
	payments.chargesEnabled = accountStatus.chargesEnabled;
	payments.payoutsEnabled = accountStatus.payoutsEnabled;
	payments.onboardingComplete = accountStatus.onboardingComplete;
	payments.defaultCurrency = accountStatus.defaultCurrency;

	if (!accountStatus.onboardingComplete) {
		reviewerResponse.payoutStatus = 'pending_connect';
		reviewerResponse.payoutFailureReason = 'Stripe onboarding is incomplete';
		reviewerResponse.payoutAmount = payoutAmount;
		payments.pendingPayoutCents += payoutAmount;
		reviewerDoc.reviewerPayments = payments;
		await reviewerDoc.save();
		await paper.save();
		return;
	}

	try {
		const transfer = await createReviewerTransfer(stripe, {
			amount: payoutAmount,
			currency: 'brl',
			destinationAccountId: payments.stripeConnectAccountId,
			paperId: paper.id,
			reviewerId,
			reviewId,
			reviewRound
		});

		reviewerResponse.payoutStatus = 'paid';
		reviewerResponse.payoutTransferId = transfer.id;
		reviewerResponse.payoutAmount = payoutAmount;
		reviewerResponse.payoutAt = new Date();
		reviewerResponse.payoutFailureReason = null;

		payments.totalEarnedCents += payoutAmount;
		payments.totalPaidOutCents += payoutAmount;
		payments.pendingPayoutCents = Math.max(0, payments.pendingPayoutCents - payoutAmount);
		payments.lastPayoutAt = new Date();
		reviewerDoc.reviewerPayments = payments;

		await reviewerDoc.save();
		await paper.save();
	} catch (error: unknown) {
		reviewerResponse.payoutStatus = 'failed';
		reviewerResponse.payoutFailureReason =
			error instanceof Error ? error.message : 'Failed to create transfer';
		reviewerResponse.payoutAmount = payoutAmount;
		payments.pendingPayoutCents += payoutAmount;
		reviewerDoc.reviewerPayments = payments;
		await reviewerDoc.save();
		await paper.save();
	}
}

function getStringFormValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value : '';
}

function normalizeReviewForm(form: any) {
	const corrections = String(form?.corrections ?? form?.weaknesses ?? '').trim();

	return {
		...form,
		corrections,
		weaknesses: corrections
	};
}

function validateSubmittedReviewForm(form: any): string | null {
	const scoreFields = [
		'originality',
		'clarity',
		'literatureReview',
		'theoreticalFoundation',
		'methodology',
		'reproducibility',
		'results',
		'figures',
		'limitations',
		'language',
		'impact'
	];

	for (const field of scoreFields) {
		const value = Number(form?.[field] ?? 0);
		if (!Number.isFinite(value) || value < 1 || value > 5) {
			return 'Please complete all quantitative scores before submitting the review.';
		}
	}

	if (!String(form?.strengths ?? '').trim()) {
		return 'Please describe the article strengths before submitting the review.';
	}

	if (!String(form?.weaknesses ?? form?.corrections ?? '').trim()) {
		return 'Please describe the corrections and suggestions before submitting the review.';
	}

	if (!['yes', 'no'].includes(String(form?.involvesHumanResearch ?? ''))) {
		return 'Please complete the ethics section before submitting the review.';
	}

	if (
		form.involvesHumanResearch === 'yes' &&
		!['adequate', 'justified', 'absent'].includes(String(form?.ethicsApproval ?? ''))
	) {
		return 'Please select the ethics approval option before submitting the review.';
	}

	if (
		!['accept_without_changes', 'accept_with_minor_revisions', 'major_revision', 'reject'].includes(
			String(form?.recommendation ?? '')
		)
	) {
		return 'Please select a final recommendation before submitting the review.';
	}

	return null;
}

async function parseReviewSubmission(request: Request) {
	const contentType = request.headers.get('content-type') || '';

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		const rawForm = getStringFormValue(formData, 'form');
		let parsedForm: any = {};

		if (rawForm) {
			try {
				parsedForm = JSON.parse(rawForm);
			} catch {
				throw new Error('Invalid review form payload');
			}
		}

		const uploadedFile =
			formData.get('reviewAttachment') ?? formData.get('attachment') ?? formData.get('file');

		return {
			paperId: getStringFormValue(formData, 'paperId'),
			reviewerId: getStringFormValue(formData, 'reviewerId'),
			paperTitle: getStringFormValue(formData, 'paperTitle'),
			reviewRound: Number(getStringFormValue(formData, 'reviewRound') || 0) || undefined,
			form: normalizeReviewForm(parsedForm),
			reviewAttachment:
				isReviewAttachmentFile(uploadedFile) && uploadedFile.size > 0 ? uploadedFile : null
		};
	}

	const reviewData = await request.json();
	return {
		...reviewData,
		form: normalizeReviewForm(reviewData?.form ?? {}),
		reviewAttachment: null
	};
}

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const paperId = url.searchParams.get('paperId');
		const reviewerId = url.searchParams.get('reviewerId');
		const reviewRound = url.searchParams.get('reviewRound');

		if (!paperId || !reviewerId || !reviewRound) {
			return json({ error: 'Missing required parameters' }, { status: 400 });
		}

		const userAliases = getUserIdAliases(user);
		if (!userAliases.includes(String(reviewerId))) {
			return json({ error: 'Reviewer mismatch' }, { status: 403 });
		}

		const authorization = await authorize(user, 'review.submit', { paperId });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
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
						corrections: review.qualitativeEvaluation.weaknesses,
						involvesHumanResearch: review.ethics.involvesHumanResearch,
						ethicsApproval: review.ethics.ethicsApproval,
						recommendation: review.recommendation
					},
					submissionDate: review.submissionDate,
					weightedScore: review.weightedScore,
					reviewAttachment: review.reviewAttachment ?? null
				}
			});
		}

		return json({ hasSubmitted: false });
	} catch (error) {
		console.error('Error checking review:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const reviewData = await parseReviewSubmission(request);
		const { paperId, paperTitle, form, reviewRound, reviewAttachment } = reviewData;
		const requestedReviewerId = reviewData.reviewerId;
		const userAliases = getUserIdAliases(user);

		// Validar dados obrigatórios
		if (!paperId || !requestedReviewerId || !paperTitle || !form) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (!userAliases.includes(String(requestedReviewerId))) {
			return json({ error: 'Reviewer mismatch' }, { status: 403 });
		}

		const reviewerId = String(user.id);

		const formValidationError = validateSubmittedReviewForm(form);
		if (formValidationError) {
			return json({ error: formValidationError }, { status: 400 });
		}

		if (reviewAttachment) {
			const attachmentValidationError = validateReviewAttachmentFile(reviewAttachment);
			if (attachmentValidationError) {
				return json({ error: attachmentValidationError }, { status: 400 });
			}
		}

		// Verificar se o paper existe
		const paper = await Papers.findOne({ id: paperId });
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const authorization = await authorize(user, 'review.submit', { paper });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
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
			return json(
				{ error: `You have already submitted a review for this round (Round ${actualRound})` },
				{ status: 400 }
			);
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
			impact: 0.1
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
		const savedReviewAttachment = reviewAttachment
			? await saveReviewAttachmentFile(reviewAttachment, {
					paperId,
					reviewerId,
					reviewId,
					reviewRound: actualRound
				})
			: null;

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
				weaknesses: form.weaknesses || form.corrections || ''
			},
			reviewAttachment: savedReviewAttachment,
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

		const reviewerResponse = paper.peer_review.responses?.find(
			(r: any) => String(r?.reviewerId) === reviewerId
		);
		if (reviewerResponse) {
			reviewerResponse.status = 'completed';
			reviewerResponse.completedAt = new Date();
			reviewerResponse.reviewId = reviewId;
		}

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

		await tryProcessReviewerPayout(paper, reviewerId, reviewId, actualRound);

		// Buscar informações para as notificações
		const reviewer = await Users.findOne({ id: reviewerId });
		const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'Revisor';
		const authorId =
			typeof paper.mainAuthor === 'string' ? paper.mainAuthor : String(paper.mainAuthor);
		const submittedById =
			typeof paper.submittedBy === 'string' ? paper.submittedBy : String(paper.submittedBy);

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
				reviewDecision: form.recommendation as
					| 'accept'
					| 'reject'
					| 'minor_revision'
					| 'major_revision',
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
				reviewAttachment: savedReviewAttachment,
				message: 'Review submitted successfully'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error saving review:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
