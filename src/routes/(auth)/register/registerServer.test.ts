import { describe, expect, it, beforeEach, vi } from 'vitest';
import { hashEmailVerificationToken } from '$lib/server/auth/emailVerification';

const mocks = vi.hoisted(() => {
	const instances: any[] = [];

	function UserModel(this: any, data: Record<string, unknown>) {
		Object.assign(this, data);
		this.save = vi.fn().mockResolvedValue(undefined);
		instances.push(this);
	}

	return {
		instances,
		findOne: vi.fn(),
		startMongo: vi.fn(),
		sendEmailVerification: vi.fn(),
		generateEmailVerificationToken: vi.fn(),
		getEmailVerificationExpiresAt: vi.fn(),
		findValidEmailReviewerInvitation: vi.fn(),
		UserModel
	};
});

vi.mock('$env/static/private', () => ({
	AUTH_CONFIG_SECRET: 'test-secret'
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => {
	(mocks.UserModel as unknown as { findOne: typeof mocks.findOne }).findOne = mocks.findOne;
	return {
		default: mocks.UserModel
	};
});

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

vi.mock('$lib/server/auth/emailReviewerInvitation', () => ({
	findValidEmailReviewerInvitation: mocks.findValidEmailReviewerInvitation
}));

function createRequest(overrides: Record<string, unknown> = {}, referer?: string) {
	return new Request('https://sciledger.online/register', {
		method: 'POST',
		headers: referer ? { referer } : undefined,
		body: JSON.stringify({
			firstName: 'Ada',
			lastName: 'Lovelace',
			username: '@adalovelace',
			country: 'BR',
			state: 'SP',
			dob: '1815-12-10',
			email: 'ada@example.com',
			password: 'strong-password',
			confirmPassword: 'strong-password',
			...overrides
		})
	});
}

describe('traditional registration email verification', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.instances.length = 0;
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.findOne.mockResolvedValue(null);
		mocks.generateEmailVerificationToken.mockReturnValue('plain-token');
		mocks.getEmailVerificationExpiresAt.mockReturnValue(new Date('2026-07-11T12:00:00.000Z'));
		mocks.sendEmailVerification.mockResolvedValue(undefined);
		mocks.findValidEmailReviewerInvitation.mockResolvedValue(null);
	});

	it('stores only the verification token hash and sends the verification email', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest(),
			url: new URL('https://sciledger.online/register')
		} as any);

		expect(response.status).toBe(201);
		const user = mocks.instances[0];
		expect(user.emailVerified).toBe(false);
		expect(user.emailVerificationTokenHash).toBe(hashEmailVerificationToken('plain-token'));
		expect(user.emailVerificationTokenHash).not.toBe('plain-token');
		expect(user.emailVerificationExpiresAt).toEqual(new Date('2026-07-11T12:00:00.000Z'));
		expect(user.emailVerificationLastSentAt).toBeInstanceOf(Date);
		expect(user.verificationSource).toBe('register');
		expect(user.save).toHaveBeenCalled();
		expect(mocks.sendEmailVerification).toHaveBeenCalledWith({
			to: 'ada@example.com',
			firstName: 'Ada',
			verificationUrl: 'https://sciledger.online/verify-email?token=plain-token'
		});
	});

	it('skips verification only when the invite token is validated server-side against the database', async () => {
		mocks.findValidEmailReviewerInvitation.mockResolvedValue({
			email: 'ada@example.com',
			hubId: 'hub-1',
			token: 'real-invite-token',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		});
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({ inviteToken: 'real-invite-token' }),
			url: new URL('https://sciledger.online/register')
		} as any);

		expect(response.status).toBe(201);
		expect(mocks.findValidEmailReviewerInvitation).toHaveBeenCalledWith(
			'real-invite-token',
			'ada@example.com'
		);
		const user = mocks.instances[0];
		expect(user.emailVerificationTokenHash).toBeUndefined();
		expect(user.emailVerificationExpiresAt).toBeUndefined();
		expect(user.emailVerificationLastSentAt).toBeUndefined();
		expect(user.verificationSource).toBeUndefined();
		expect(mocks.generateEmailVerificationToken).not.toHaveBeenCalled();
		expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
	});

	it('requires verification when the invite token does not resolve to a valid invitation', async () => {
		mocks.findValidEmailReviewerInvitation.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({ inviteToken: 'fake-or-expired-token' }),
			url: new URL('https://sciledger.online/register')
		} as any);

		expect(response.status).toBe(201);
		const user = mocks.instances[0];
		expect(user.emailVerificationTokenHash).toBe(hashEmailVerificationToken('plain-token'));
		expect(user.verificationSource).toBe('register');
		expect(mocks.sendEmailVerification).toHaveBeenCalled();
	});

	it('never trusts the Referer header to bypass email verification', async () => {
		// A spoofed Referer claiming an inviteToken must have zero effect: only a body
		// inviteToken that resolves through findValidEmailReviewerInvitation can skip
		// verification. Here the mocked resolver still returns null (no real invite).
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({}, 'https://sciledger.online/register?inviteToken=spoofed'),
			url: new URL('https://sciledger.online/register')
		} as any);

		expect(response.status).toBe(201);
		const user = mocks.instances[0];
		expect(user.emailVerificationTokenHash).toBe(hashEmailVerificationToken('plain-token'));
		expect(user.verificationSource).toBe('register');
		expect(mocks.sendEmailVerification).toHaveBeenCalled();
	});

	it('normalizes the email before checking for an existing user and storing the account', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({ email: '  Ada@EXAMPLE.com  ' }),
			url: new URL('https://sciledger.online/register')
		} as any);

		expect(response.status).toBe(201);
		expect(mocks.findOne).toHaveBeenCalledWith({ email: 'ada@example.com' });
		const user = mocks.instances[0];
		expect(user.email).toBe('ada@example.com');
		expect(user.handle).toBe('ada@example.com');
		expect(mocks.findValidEmailReviewerInvitation).toHaveBeenCalledWith(undefined, 'ada@example.com');
	});
});
