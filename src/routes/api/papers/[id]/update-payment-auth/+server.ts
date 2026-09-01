import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reconcilePaperPayment } from '$lib/server/payments/paperPaymentService';
import { paymentErrorResponse } from '$lib/server/payments/paymentHttp';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated', code: 'unauthenticated' }, { status: 401 });
		}

		const paperId = params.id;
		if (!paperId) {
			return json({ error: 'Paper ID is required', code: 'paper_id_required' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));
		const paymentIntentId =
			body?.paymentIntentId || body?.paymentAuthorizationCode
				? String(body.paymentIntentId || body.paymentAuthorizationCode)
				: undefined;

		const result = await reconcilePaperPayment({
			paperId,
			user,
			paymentIntentId
		});

		return json({
			success: true,
			paperId,
			paymentIntentId: result.paymentIntent.id,
			status: result.paymentIntent.status,
			paymentState: result.paymentState,
			amount: result.paymentIntent.amount,
			amountCents: result.paymentIntent.amount,
			currency: result.paymentIntent.currency,
			canSubmit: result.paymentState === 'captured',
			policy: result.policy,
			purpose: result.purpose,
			receiptUrl: result.attempt.receiptUrl
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to reconcile paper payment');
	}
};
