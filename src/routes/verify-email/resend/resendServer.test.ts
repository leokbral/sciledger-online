import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashEmailVerificationToken } from '$lib/server/auth/emailVerification';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn(),
	updateOne: vi.fn(),
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
		findOne: mocks.findOne,
		updateOne: mocks.updateOne
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
		mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
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

	it('returns a recoverable delivery error and restores the previous token on SMTP failure', async () => {
		const previous = {
			emailVerificationTokenHash: hashEmailVerificationToken('old-token'),
			emailVerificationExpiresAt: new Date('2026-12-01T12:00:00Z'),
			emailVerificationLastSentAt: new Date('2026-01-01T12:00:00Z')
		};
		mocks.findOne.mockResolvedValue({
			email: 'user@example.com',
			firstName: 'Ada',
			emailVerified: false,
			verificationSource: 'register',
			...previous,
			save: mocks.save
		});
		mocks.sendEmailVerification.mockRejectedValue(
			Object.assign(new Error('SMTP authentication failed'), { code: 'EAUTH', responseCode: 535 })
		);
		const { POST } = await import('./+server');
		const response = await POST({
			request: createRequest('user@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ code: 'email_delivery_failed' });
		expect(mocks.updateOne).toHaveBeenCalledWith(
			{
				email: 'user@example.com',
				emailVerified: false,
				emailVerificationTokenHash: hashEmailVerificationToken('new-token')
			},
			{ $set: previous }
		);
	});

	it('removes the failed resend cooldown when there was no previous token', async () => {
		mocks.findOne.mockResolvedValue({
			email: 'user@example.com',
			firstName: 'Ada',
			emailVerified: false,
			verificationSource: 'register',
			save: mocks.save
		});
		mocks.sendEmailVerification.mockRejectedValue(new Error('Email service is not configured'));
		const { POST } = await import('./+server');
		const response = await POST({
			request: createRequest('user@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		expect(response.status).toBe(503);
		expect(mocks.updateOne).toHaveBeenCalledWith(expect.anything(), {
			$unset: {
				emailVerificationTokenHash: '',
				emailVerificationExpiresAt: '',
				emailVerificationLastSentAt: ''
			}
		});
	});

	it('returns JSON when the database is unavailable', async () => {
		mocks.startMongo.mockRejectedValue(new Error('Database unavailable'));
		const { POST } = await import('./+server');
		const response = await POST({
			request: createRequest('user@example.com'),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		expect(response.status).toBe(500);
		expect(await response.json()).toMatchObject({ code: 'verification_unavailable' });
	});

	it('rejects malformed requests before touching the database', async () => {
		const { POST } = await import('./+server');
		const response = await POST({
			request: new Request('https://sciledger.online/verify-email/resend', {
				method: 'POST',
				body: '{'
			}),
			url: new URL('https://sciledger.online/verify-email/resend')
		} as any);
		expect(response.status).toBe(400);
		expect(mocks.startMongo).not.toHaveBeenCalled();
	});
});
