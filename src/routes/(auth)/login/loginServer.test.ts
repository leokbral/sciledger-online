import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn(),
	respondWithSession: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	AUTH_CONFIG_SECRET: 'test-secret'
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.findOne
	}
}));

vi.mock('$lib/server/auth/authResponse', () => ({
	respondWithSession: mocks.respondWithSession
}));

function hashPassword(password: string) {
	return crypto.pbkdf2Sync(password, 'test-secret', 1000, 64, 'sha512').toString('hex');
}

function createLoginRequest(rememberMe: boolean) {
	return new Request('https://sciledger.online/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			login: 'user@example.com',
			password: 'correct-password',
			rememberMe
		})
	});
}

describe('login route persistent sessions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.findOne.mockResolvedValue({
			id: 'user-1',
			email: 'user@example.com',
			password: hashPassword('correct-password')
		});
		mocks.respondWithSession.mockResolvedValue(new Response(JSON.stringify({ user: { id: 'user-1' } })));
	});

	it('creates a normal session when rememberMe is false', async () => {
		const { POST } = await import('./+server');
		const request = createLoginRequest(false);
		const url = new URL(request.url);

		await POST({ request, url } as Parameters<typeof POST>[0]);

		expect(mocks.respondWithSession).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					id: 'user-1'
				})
			}),
			expect.objectContaining({
				request,
				url,
				rememberMe: false
			})
		);
	});

	it('creates a rememberMe session when rememberMe is true', async () => {
		const { POST } = await import('./+server');
		const request = createLoginRequest(true);
		const url = new URL(request.url);

		await POST({ request, url } as Parameters<typeof POST>[0]);

		expect(mocks.respondWithSession).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					id: 'user-1'
				})
			}),
			expect.objectContaining({
				request,
				url,
				rememberMe: true
			})
		);
	});
});
