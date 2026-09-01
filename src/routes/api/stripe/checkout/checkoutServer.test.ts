import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	env: {
		STRIPE_SECRET_KEY: 'sk_test_123',
		ENABLE_STRIPE_TEST_CHECKOUT: ''
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: mocks.env
}));

function createEvent() {
	return {
		request: {
			json: async () => ({ amount: 1000, currency: 'brl' })
		}
	} as any;
}

describe('POST /api/stripe/checkout test route guard', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.resetModules();
		mocks.env.STRIPE_SECRET_KEY = 'sk_test_123';
		mocks.env.ENABLE_STRIPE_TEST_CHECKOUT = '';
		process.env.NODE_ENV = originalNodeEnv;
	});

	it('is disabled by default in production', async () => {
		process.env.NODE_ENV = 'production';
		const { POST } = await import('./+server');

		const response = await POST(createEvent());
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toContain('disabled');
	});

	it('does not allow the test route to use a live Stripe secret key', async () => {
		process.env.NODE_ENV = 'production';
		mocks.env.ENABLE_STRIPE_TEST_CHECKOUT = 'true';
		mocks.env.STRIPE_SECRET_KEY = 'sk_live_123';
		const { POST } = await import('./+server');

		const response = await POST(createEvent());
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body.error).toContain('live secret key');
	});
});
