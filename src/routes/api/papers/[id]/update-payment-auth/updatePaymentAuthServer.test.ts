import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	class MockPaymentDomainError extends Error {
		status: number;
		code: string;

		constructor(message: string, status = 400, code = 'payment_error') {
			super(message);
			this.status = status;
			this.code = code;
		}
	}

	return {
		PaymentDomainError: MockPaymentDomainError,
		reconcilePaperPayment: vi.fn()
	};
});

vi.mock('$lib/server/payments/paperPaymentService', () => ({
	PaymentDomainError: mocks.PaymentDomainError,
	reconcilePaperPayment: mocks.reconcilePaperPayment
}));

function createPostEvent(
	body: Record<string, unknown>,
	user: any = { id: 'user-1' },
	params: Record<string, string> = { id: 'paper-1' }
) {
	return {
		request: {
			json: async () => body
		},
		locals: { user },
		params
	} as any;
}

describe('POST /api/papers/[id]/update-payment-auth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('requires authentication', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createPostEvent({ paymentIntentId: 'pi_123' }, null));
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.code).toBe('unauthenticated');
		expect(mocks.reconcilePaperPayment).not.toHaveBeenCalled();
	});

	it('reconciles the current paper payment instead of trusting client status', async () => {
		mocks.reconcilePaperPayment.mockResolvedValue({
			paymentIntent: { id: 'pi_123', status: 'succeeded', amount: 40000, currency: 'brl' },
			paymentState: 'captured',
			policy: 'submission',
			purpose: 'standalone_submission',
			attempt: { receiptUrl: 'https://receipt.example' }
		});
		const { POST } = await import('./+server');

		const response = await POST(
			createPostEvent({ paymentIntentId: 'pi_123', status: 'captured', amount: 1 })
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.canSubmit).toBe(true);
		expect(body.amountCents).toBe(40000);
		expect(body.purpose).toBe('standalone_submission');
		expect(mocks.reconcilePaperPayment).toHaveBeenCalledWith({
			paperId: 'paper-1',
			user: { id: 'user-1' },
			paymentIntentId: 'pi_123'
		});
	});

	it('rejects arbitrary PaymentIntent association through the service guard', async () => {
		mocks.reconcilePaperPayment.mockRejectedValue(
			new mocks.PaymentDomainError(
				'PaymentIntent does not match the current paper payment.',
				403,
				'payment_intent_mismatch'
			)
		);
		const { POST } = await import('./+server');

		const response = await POST(createPostEvent({ paymentIntentId: 'pi_other' }));
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body.code).toBe('payment_intent_mismatch');
	});
});
