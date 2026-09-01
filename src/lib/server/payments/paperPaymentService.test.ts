import { describe, expect, it } from 'vitest';
import {
	assertUserCanManageStandalonePaperPayment,
	mapStripePaymentIntentStatus,
	paymentPurposeForPolicy,
	resolvePaperPaymentPolicy,
	resolvePaperPaymentState
} from './paperPaymentService';

describe('paper payment service', () => {
	it('resolves standalone submission payment states separately from Paper.status', () => {
		const paper = { id: 'paper-1', status: 'draft', submittedBy: 'user-1' };

		expect(resolvePaperPaymentState(paper, null)).toBe('unpaid');
		expect(resolvePaperPaymentState(paper, { status: 'pending' })).toBe('processing');
		expect(resolvePaperPaymentState(paper, { status: 'requires_action' })).toBe('requires_action');
		expect(resolvePaperPaymentState(paper, { status: 'failed' })).toBe('retry_required');
		expect(resolvePaperPaymentState(paper, { status: 'cancelled' })).toBe('retry_required');
		expect(resolvePaperPaymentState(paper, { status: 'captured' })).toBe('captured');
	});

	it('resolves Hub paper payment state separately from Paper.status', () => {
		expect(
			resolvePaperPaymentState(
				{ id: 'paper-1', hubId: 'hub-1', status: 'draft', submittedBy: 'user-1' },
				null
			)
		).toBe('unpaid');
	});

	it('maps standalone and Hub policies to semantic payment purposes', () => {
		expect(paymentPurposeForPolicy({ isStandalone: true, policy: 'publication' })).toBe(
			'standalone_submission'
		);
		expect(paymentPurposeForPolicy({ isStandalone: false, policy: 'submission' })).toBe(
			'hub_submission'
		);
		expect(paymentPurposeForPolicy({ isStandalone: false, policy: 'review' })).toBe(
			'hub_review'
		);
		expect(paymentPurposeForPolicy({ isStandalone: false, policy: 'publication' })).toBe(
			'hub_publication'
		);
	});

	it('resolves a populated Hub billing policy without using Paper.status as payment state', async () => {
		const resolved = await resolvePaperPaymentPolicy({
			id: 'paper-1',
			hubId: {
				id: 'hub-1',
				billing: {
					paperPaymentPolicy: 'review',
					policyVersion: 'hub-billing-v2'
				}
			},
			status: 'reviewer assignment'
		});

		expect(resolved.policy).toBe('review');
		expect(resolved.purpose).toBe('hub_review');
		expect(resolved.policyVersion).toBe('hub:hub-1:hub-billing-v2:review');
	});

	it('maps Stripe PaymentIntent statuses into local attempt states', () => {
		expect(mapStripePaymentIntentStatus({ status: 'succeeded', last_payment_error: null } as any)).toBe(
			'captured'
		);
		expect(
			mapStripePaymentIntentStatus({ status: 'requires_capture', last_payment_error: null } as any)
		).toBe('authorized');
		expect(
			mapStripePaymentIntentStatus({ status: 'requires_action', last_payment_error: null } as any)
		).toBe('requires_action');
		expect(
			mapStripePaymentIntentStatus({ status: 'requires_payment_method', last_payment_error: null } as any)
		).toBe('pending');
		expect(
			mapStripePaymentIntentStatus({
				status: 'requires_payment_method',
				last_payment_error: { message: 'card declined' }
			} as any)
		).toBe('failed');
	});

	it('allows only the submitting user to manage standalone paper payment', () => {
		const paper = { id: 'paper-1', submittedBy: 'user-1', status: 'draft' };

		expect(() => assertUserCanManageStandalonePaperPayment({ id: 'user-1' }, paper)).not.toThrow();
		expect(() => assertUserCanManageStandalonePaperPayment({ id: 'user-2' }, paper)).toThrow(
			/You cannot manage payment/
		);
	});
});
