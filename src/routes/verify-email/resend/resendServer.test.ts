import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashEmailVerificationToken } from '$lib/server/auth/emailVerification';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn(),
	save: vi.fn(),
	sendEmailVerification: vi.fn(),
	generateEmailVerificationToken: vi.fn(),
	getEmailVerificationExpiresAt: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.findOne
	}
}));

vi.mock('$lib/server/auth/emailVerification', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/auth/emailVerification')>(
		'$lib/server/auth/emailVerification'
	);

	return {
		...actual,
		generateEmailVerificationToken: mocks.generateEmailVerificationToken,
		getEmailVerificationExpiresAt: mocks.getEmailVerificationExpiresAt,
		sendEmailVerification: mocks.sendEmailVerification
	};
});

function createRequest(email: string) {
	return new Request('https://sciledger.online/verify-email/resend', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ email })
	});
}

describe('email verification resend endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.save.mockResolvedValue(undefined);
		mocks.sendEmailVerification.mockResolvedValue(undefined);
		mocks.generateEmailVerificationToken.mockReturnValue('new-token');
		mocks.getEmailVerificationExpiresAt.mockReturnValue(new Date('2026-07-11T12:00:00.000Z'));
	});

	it('returns success for an unknown user without sending email', async () => {
		mocks.findOne.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest('missing@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
	});

	it('rejects resend while cooldown is active', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
		mocks.findOne.mockResolvedValue({
			email: 'user@example.com',
			emailVerified: false,
			verificationSource: 'register',
			emailVerificationLastSentAt: new Date('2026-07-10T11:59:30.000Z'),
			save: mocks.save
		});
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest('user@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(429);
		expect(body.retryAfterSeconds).toBe(30);
		expect(mocks.generateEmailVerificationToken).not.toHaveBeenCalled();
		expect(mocks.save).not.toHaveBeenCalled();
		expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
	});

	it('does not resend verification for users outside traditional registration', async () => {
		mocks.findOne.mockResolvedValue({
			email: 'invite@example.com',
			emailVerified: false,
			save: mocks.save
		});
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest('invite@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(mocks.generateEmailVerificationToken).not.toHaveBeenCalled();
		expect(mocks.save).not.toHaveBeenCalled();
		expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
	});

	it('normalizes the email (trim + lowercase) before looking up the user', async () => {
		mocks.findOne.mockResolvedValue(null);
		const { POST } = await import('./+server');

		await POST({
			request: createRequest('  User@EXAMPLE.com  '),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);

		expect(mocks.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
	});

	it('renews the token hash and resends the verification email', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
		const user = {
			email: 'user@example.com',
			firstName: 'Ada',
			emailVerified: false,
			emailVerificationTokenHash: hashEmailVerificationToken('old-token'),
			emailVerificationExpiresAt: new Date('2026-07-10T13:00:00.000Z'),
			emailVerificationLastSentAt: new Date('2026-07-10T11:58:00.000Z'),
			verificationSource: 'register',
			updatedAt: '',
			save: mocks.save
		};
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest('user@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);

		expect(response.status).toBe(200);
		expect(user.emailVerificationTokenHash).toBe(hashEmailVerificationToken('new-token'));
		expect(user.emailVerificationTokenHash).not.toBe('new-token');
		expect(user.emailVerificationExpiresAt).toEqual(new Date('2026-07-11T12:00:00.000Z'));
		expect(user.emailVerificationLastSentAt).toEqual(new Date('2026-07-10T12:00:00.000Z'));
		expect(user.verificationSource).toBe('register');
		expect(mocks.save).toHaveBeenCalled();
		expect(mocks.sendEmailVerification).toHaveBeenCalledWith({
			to: 'user@example.com',
			firstName: 'Ada',
			verificationUrl: 'https://sciledger.online/verify-email?token=new-token'
		});
	});
});
