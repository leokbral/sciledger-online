import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelPaperPayment } from '$lib/server/payments/paperPaymentService';
import { paymentErrorResponse } from '$lib/server/payments/paymentHttp';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated', code: 'unauthenticated' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		const paperId = body?.paperId ? String(body.paperId) : '';
		const reason = body?.reason ? String(body.reason) : undefined;

		if (!paperId) {
			return json({ error: 'paperId is required', code: 'paper_id_required' }, { status: 400 });
		}

		const result = await cancelPaperPayment({ paperId, user, reason });
		return json({
			success: true,
			message: 'Payment cancelled successfully',
			paperId,
			paymentIntentId: result.paymentIntent.id,
			paymentState: result.paymentState,
			policy: result.policy,
			purpose: result.purpose,
			status: result.attempt.status,
			providerStatus: result.paymentIntent.status,
			cancelledAt: result.attempt.cancelledAt,
			reason: result.attempt.failureReason
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to cancel paper payment');
	}
};
