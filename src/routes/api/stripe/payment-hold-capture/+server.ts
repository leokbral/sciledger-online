import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	capturePaperPayment,
	loadPaperPaymentState
} from '$lib/server/payments/paperPaymentService';
import { paymentErrorResponse } from '$lib/server/payments/paymentHttp';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated', code: 'unauthenticated' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		const paperId = body?.paperId ? String(body.paperId) : '';
		if (!paperId) {
			return json({ error: 'paperId is required', code: 'paper_id_required' }, { status: 400 });
		}

		const result = await capturePaperPayment({ paperId, user });
		return json({
			success: true,
			message: 'Payment captured successfully',
			paperId,
			paymentIntentId: result.paymentIntent.id,
			amount: result.paymentIntent.amount,
			amountCents: result.paymentIntent.amount,
			currency: result.paymentIntent.currency,
			paymentState: result.paymentState,
			policy: result.policy,
			purpose: result.purpose,
			status: result.attempt.status,
			capturedAt: result.attempt.capturedAt,
			receiptUrl: result.attempt.receiptUrl
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to capture paper payment');
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated', code: 'unauthenticated' }, { status: 401 });
		}

		const paperId = url.searchParams.get('paperId');
		if (!paperId) {
			return json({ error: 'paperId is required', code: 'paper_id_required' }, { status: 400 });
		}

		const state = await loadPaperPaymentState(paperId, user);
		const attempt = state.attempt as any;

		return json({
			success: true,
			paperId,
			paymentState: state.state,
			amount: state.amountCents,
			amountCents: state.amountCents,
			currency: state.currency,
			status: attempt?.status,
			providerStatus: attempt?.providerStatus,
			policy: state.policy,
			purpose: state.purpose,
			capturedAt: attempt?.capturedAt,
			receiptUrl: attempt?.receiptUrl
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to retrieve paper payment');
	}
};
