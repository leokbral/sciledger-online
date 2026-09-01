import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createPaperPaymentIntent,
	loadPaperPaymentState,
	reconcilePaperPayment
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
		const acceptPaymentPolicy = body?.acceptPaymentPolicy === true;

		if (!paperId) {
			return json({ error: 'paperId is required', code: 'paper_id_required' }, { status: 400 });
		}

		const result = await createPaperPaymentIntent({ paperId, user, acceptPaymentPolicy });

		return json({
			success: true,
			alreadyPaid: result.alreadyPaid,
			paymentIntentId: result.paymentIntentId,
			clientSecret: result.clientSecret,
			amount: result.amountCents,
			amountCents: result.amountCents,
			currency: result.currency,
			status: result.status,
			paymentState: result.paymentState,
			policy: result.policy,
			purpose: result.purpose,
			policyVersion: result.policyVersion,
			paymentAttemptId: String(result.attempt.id || result.attempt._id)
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to create paper payment');
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated', code: 'unauthenticated' }, { status: 401 });
		}

		const paperId = url.searchParams.get('paperId');
		const paymentIntentId = url.searchParams.get('id');

		if (!paperId) {
			return json({ error: 'paperId is required', code: 'paper_id_required' }, { status: 400 });
		}

		const state: any = paymentIntentId
			? await reconcilePaperPayment({ paperId, user, paymentIntentId })
			: await loadPaperPaymentState(paperId, user);

		const attempt = state.attempt as any;
		return json({
			success: true,
			paperId,
			paymentState: state.paymentState ?? state.state,
			amount: state.amountCents ?? attempt?.amountCents,
			amountCents: state.amountCents ?? attempt?.amountCents,
			currency: state.currency ?? attempt?.currency,
			status: attempt?.status,
			providerStatus: attempt?.providerStatus,
			policy: state.policy,
			purpose: state.purpose,
			policyVersion: state.policyVersion,
			receiptUrl: attempt?.receiptUrl
		});
	} catch (error) {
		return paymentErrorResponse(error, 'Failed to retrieve paper payment');
	}
};
