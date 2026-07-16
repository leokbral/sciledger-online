import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPasswordResetToken } from '$lib/server/auth/passwordReset';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	model: vi.fn(),
	findOne: vi.fn(),
	save: vi.fn(),
	revokeAllUserSessions: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	AUTH_CONFIG_SECRET: 'test-secret'
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/schemas/UserSchema.js', () => ({
	UserSchema: {}
}));

vi.mock('$lib/server/auth/SessionService', () => ({
	revokeAllUserSessions: mocks.revokeAllUserSessions
}));

vi.mock('mongoose', () => ({
	default: {
		models: {},
		model: mocks.model
	}
}));

function hashPassword(password: string) {
	return crypto.pbkdf2Sync(password, 'test-secret', 1000, 64, 'sha512').toString('hex');
}

function createResetRequest(newPassword = 'new-password1') {
	return new Request('https://sciledger.online/reset/update', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			token: 'a'.repeat(64),
			newPassword
		})
	});
}

describe('password reset session revocation', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.model.mockReturnValue({
			findOne: mocks.findOne
		});
		mocks.findOne.mockResolvedValue({
			id: 'user-1',
			_id: 'user-1',
			email: 'user@example.com',
			firstName: 'Ada',
			password: hashPassword('old-password1'),
			save: mocks.save
		});
		mocks.save.mockResolvedValue(undefined);
		mocks.revokeAllUserSessions.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
	});

	it('revokes all persistent sessions after updating the password', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createResetRequest()
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		expect(mocks.save).toHaveBeenCalled();
		expect(mocks.revokeAllUserSessions).toHaveBeenCalledWith('user-1', 'password_reset');
	});

	it('looks up the user by the hashed token, never the raw token', async () => {
		const rawToken = 'a'.repeat(64);
		const { POST } = await import('./+server');

		await POST({
			request: createResetRequest()
		} as Parameters<typeof POST>[0]);

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
		// Simulates the real-world consequence of the migration: a
		// pre-migration document never had resetPasswordTokenHash set, and
		// the query only ever filters on that field, so it can never match
		// regardless of what raw token the old email link still points to.
		mocks.findOne.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createResetRequest()
		} as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/invalid or expired/i);
		expect(mocks.revokeAllUserSessions).not.toHaveBeenCalled();
	});

	it('clears the stored token hash after a successful reset', async () => {
		const user = {
			id: 'user-1',
			_id: 'user-1',
			email: 'user@example.com',
			firstName: 'Ada',
			password: hashPassword('old-password1'),
			resetPasswordTokenHash: hashPasswordResetToken('a'.repeat(64)),
			resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
			save: mocks.save
		};
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		await POST({
			request: createResetRequest()
		} as Parameters<typeof POST>[0]);

		expect(user.resetPasswordTokenHash).toBeUndefined();
		expect(user.resetPasswordExpiresAt).toBeUndefined();
	});
});
