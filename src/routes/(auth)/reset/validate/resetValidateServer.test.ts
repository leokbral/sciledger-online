import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPasswordResetToken } from '$lib/server/auth/passwordReset';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	model: vi.fn(),
	findOne: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/schemas/UserSchema.js', () => ({
	UserSchema: {}
}));

vi.mock('mongoose', () => ({
	default: {
		models: {},
		model: mocks.model
	}
}));

function createValidateRequest(token: string) {
	return new Request('https://sciledger.online/reset/validate', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ token })
	});
}

describe('reset/validate token hashing', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.model.mockReturnValue({ findOne: mocks.findOne });
	});

	it('rejects a malformed token before ever querying the database', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createValidateRequest('not-a-valid-hex-token')
		} as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/invalid token format/i);
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('looks up the user by the hashed token, never the raw token', async () => {
		mocks.findOne.mockResolvedValue(null);
		const rawToken = 'b'.repeat(64);
		const { POST } = await import('./+server');

		await POST({ request: createValidateRequest(rawToken) } as Parameters<typeof POST>[0]);

		expect(mocks.findOne).toHaveBeenCalledWith(
			expect.objectContaining({
				resetPasswordTokenHash: hashPasswordResetToken(rawToken)
			})
		);
		const query = mocks.findOne.mock.calls[0][0];
		expect(query.resetPasswordTokenHash).not.toBe(rawToken);
		expect(query).not.toHaveProperty('resetPasswordToken');
	});

	it('rejects tokens from before the hashing migration -- a document with no resetPasswordTokenHash can never match', async () => {
		// Simulates the real-world consequence of the migration: any
		// pre-migration reset link's raw token hashes to a value that was
		// never stored anywhere (the old field name/format is gone), so the
		// query returns nothing, exactly like an unknown token would.
		mocks.findOne.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createValidateRequest('c'.repeat(64))
		} as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/invalid or expired/i);
	});

	it('rejects a token that is about to expire (within 5 minutes)', async () => {
		mocks.findOne.mockResolvedValue({
			email: 'user@example.com',
			firstName: 'Ada',
			resetPasswordExpiresAt: new Date(Date.now() + 60 * 1000).toISOString()
		});
		const { POST } = await import('./+server');

		const response = await POST({
			request: createValidateRequest('d'.repeat(64))
		} as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.expiringSoon).toBe(true);
	});

	it('returns valid: true for a token with plenty of time left', async () => {
		mocks.findOne.mockResolvedValue({
			email: 'user@example.com',
			firstName: 'Ada',
			resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
		});
		const { POST } = await import('./+server');

		const response = await POST({
			request: createValidateRequest('e'.repeat(64))
		} as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			valid: true,
			user: { email: 'user@example.com', firstName: 'Ada' }
		});
	});
});
