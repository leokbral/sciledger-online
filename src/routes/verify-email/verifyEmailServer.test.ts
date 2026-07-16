import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashEmailVerificationToken } from '$lib/server/auth/emailVerification';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn(),
	save: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.findOne
	}
}));

function createRequestEvent(token?: string) {
	const url = new URL('https://sciledger.online/verify-email');
	if (token) {
		url.searchParams.set('token', token);
	}
	return { url } as any;
}

describe('email verification endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.save.mockResolvedValue(undefined);
	});

	it('verifies a user with a valid token and removes token fields', async () => {
		const token = 'valid-token';
		const user = {
			emailVerified: false,
			emailVerifiedAt: undefined as Date | undefined,
			verificationSource: undefined as string | undefined,
			emailVerificationTokenHash: hashEmailVerificationToken(token),
			emailVerificationExpiresAt: new Date('2026-07-10T13:00:00.000Z'),
			updatedAt: '',
			save: mocks.save
		};
		mocks.findOne.mockResolvedValue(user);
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

		const { GET } = await import('./+server');

		await expect(GET(createRequestEvent(token))).rejects.toMatchObject({
			status: 302,
			location: '/verify-email/success'
		});

		expect(mocks.findOne).toHaveBeenCalledWith({
			emailVerificationTokenHash: hashEmailVerificationToken(token)
		});
		expect(user.emailVerified).toBe(true);
		expect(user.emailVerifiedAt).toBeInstanceOf(Date);
		expect(user.verificationSource).toBe('register');
		expect(user.emailVerificationTokenHash).toBeUndefined();
		expect(user.emailVerificationExpiresAt).toBeUndefined();
		expect(mocks.save).toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('rejects an invalid token', async () => {
		mocks.findOne.mockResolvedValue(null);
		const { GET } = await import('./+server');

		await expect(GET(createRequestEvent('invalid-token'))).rejects.toMatchObject({
			status: 400
		});
		expect(mocks.save).not.toHaveBeenCalled();
	});

	it('rejects an expired token', async () => {
		const token = 'expired-token';
		mocks.findOne.mockResolvedValue({
			emailVerificationTokenHash: hashEmailVerificationToken(token),
			emailVerificationExpiresAt: new Date('2026-07-10T11:00:00.000Z'),
			save: mocks.save
		});
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
		const { GET } = await import('./+server');

		await expect(GET(createRequestEvent(token))).rejects.toMatchObject({
			status: 400
		});
		expect(mocks.save).not.toHaveBeenCalled();
		vi.useRealTimers();
	});
});
