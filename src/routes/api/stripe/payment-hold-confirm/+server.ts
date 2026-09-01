import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { confirmPaperPayment } from '$lib/server/payments/paperPaymentService';
import { paymentErrorResponse } from '$lib/server/payments/paymentHttp';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated', code: 'unauthenticated' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		const paperId = body?.paperId ? String(body.paperId) : '';
		const paymentIntentId = body?.paymentIntentId ? String(body.paymentIntentId) : undefined;
		const paymentMethodId = body?.paymentMethodId ? String(body.paymentMethodId) : undefined;

		if (!paperId) {
			return json({ error: 'paperId is required', code: 'paper_id_required' }, { status: 400 });
		}

		const result = await confirmPaperPayment({
			paperId,
			user,
			paymentIntentId,
			paymentMethodId
		});

		return json({
			success: result.paymentState === 'captured',
			paperId,
			paymentIntentId: result.paymentIntent.id,
			status: result.paymentIntent.status,
			paymentState: result.paymentState,
			amount: result.paymentIntent.amount,
			amountCents: result.paymentIntent.amount,
			currency: result.paymentIntent.currency,
			policy: result.policy,
			purpose: result.purpose,
			receiptUrl: result.attempt.receiptUrl
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to confirm paper payment');
	}
};
