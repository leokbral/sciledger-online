import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	class MockPaymentDomainError extends Error {
		status: number;
		code: string;
		details?: Record<string, unknown>;

		constructor(message: string, status = 400, code = 'payment_error', details?: Record<string, unknown>) {
			super(message);
			this.status = status;
			this.code = code;
			this.details = details;
		}
	}

	return {
		PaymentDomainError: MockPaymentDomainError,
		createPaperPaymentIntent: vi.fn(),
		loadPaperPaymentState: vi.fn(),
		reconcilePaperPayment: vi.fn()
	};
});

vi.mock('$lib/server/payments/paperPaymentService', () => ({
	PaymentDomainError: mocks.PaymentDomainError,
	createPaperPaymentIntent: mocks.createPaperPaymentIntent,
	loadPaperPaymentState: mocks.loadPaperPaymentState,
	reconcilePaperPayment: mocks.reconcilePaperPayment
}));

function createPostEvent(body: Record<string, unknown>, user: any = { id: 'user-1' }) {
	return {
		request: {
			json: async () => body
		},
		locals: { user }
	} as any;
}

describe('POST /api/stripe/payment-hold', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('requires authentication', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createPostEvent({ paperId: 'paper-1' }, null));
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.code).toBe('unauthenticated');
		expect(mocks.createPaperPaymentIntent).not.toHaveBeenCalled();
	});

	it('requires paperId and never starts a pending payment without a Paper', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createPostEvent({ amount: 1, currency: 'usd' }));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.code).toBe('paper_id_required');
		expect(mocks.createPaperPaymentIntent).not.toHaveBeenCalled();
	});

	it('ignores client amount/currency and delegates policy acceptance explicitly', async () => {
		mocks.createPaperPaymentIntent.mockResolvedValue({
			alreadyPaid: false,
			paymentIntentId: 'pi_123',
			clientSecret: 'secret',
			amountCents: 40000,
			currency: 'brl',
			status: 'requires_payment_method',
			paymentState: 'processing',
			policy: 'submission',
			purpose: 'standalone_submission',
			policyVersion: 'platform-paper-payment-v1',
			attempt: { id: 'attempt-1' }
		});
		const { POST } = await import('./+server');

		const response = await POST(
			createPostEvent({
				paperId: 'paper-1',
				amount: 1,
				currency: 'usd',
				status: 'captured',
				acceptPaymentPolicy: true
			})
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.amountCents).toBe(40000);
		expect(body.currency).toBe('brl');
		expect(body.purpose).toBe('standalone_submission');
		expect(mocks.createPaperPaymentIntent).toHaveBeenCalledWith({
			paperId: 'paper-1',
			user: { id: 'user-1' },
			acceptPaymentPolicy: true
		});
	});

	it('returns domain authorization errors from the payment service', async () => {
		mocks.createPaperPaymentIntent.mockRejectedValue(
			new mocks.PaymentDomainError('You cannot manage payment for this paper.', 403, 'paper_payment_forbidden')
		);
		const { POST } = await import('./+server');

		const response = await POST(createPostEvent({ paperId: 'paper-2' }));
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body.code).toBe('paper_payment_forbidden');
	});
});
