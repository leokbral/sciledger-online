import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPasswordResetToken } from '$lib/server/auth/passwordReset';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	model: vi.fn(),
	findOne: vi.fn(),
	save: vi.fn(),
	generatePasswordResetToken: vi.fn(),
	getPasswordResetExpiresAt: vi.fn(),
	sendMail: vi.fn(),
	verify: vi.fn(),
	createTransport: vi.fn(),
	buildPasswordResetEmailHtml: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	SITE_URL: 'https://sciledger.online'
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		SMTP_USER: 'noreply@sciledger.online',
		SMTP_PASS: 'test-smtp-pass',
		SMTP_HOST: 'smtp.example.com',
		SMTP_PORT: '587'
	}
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

vi.mock('nodemailer', () => ({
	default: {
		createTransport: mocks.createTransport
	}
}));

vi.mock('$lib/services/platformEmailTemplates', () => ({
	buildPasswordResetEmailHtml: mocks.buildPasswordResetEmailHtml
}));

vi.mock('$lib/server/auth/passwordReset', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/auth/passwordReset')>(
		'$lib/server/auth/passwordReset'
	);

	return {
		...actual,
		generatePasswordResetToken: mocks.generatePasswordResetToken,
		getPasswordResetExpiresAt: mocks.getPasswordResetExpiresAt
	};
});

function createRecoveryRequest(email: string) {
	return new Request('https://sciledger.online/recovery', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email })
	});
}

describe('password recovery token hashing and email normalization', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.model.mockReturnValue({ findOne: mocks.findOne });
		mocks.generatePasswordResetToken.mockReturnValue('plain-reset-token');
		mocks.getPasswordResetExpiresAt.mockReturnValue(new Date('2026-07-10T13:00:00.000Z'));
		mocks.buildPasswordResetEmailHtml.mockReturnValue('<html></html>');
		mocks.verify.mockResolvedValue(undefined);
		mocks.sendMail.mockResolvedValue(undefined);
		mocks.createTransport.mockReturnValue({
			verify: mocks.verify,
			sendMail: mocks.sendMail
		});
	});

	it('stores only the SHA-256 hash of the reset token, never the raw token', async () => {
		const user = {
			email: 'user@example.com',
			firstName: 'Ada',
			resetPasswordTokenHash: undefined as string | undefined,
			resetPasswordExpiresAt: undefined as Date | undefined,
			updatedAt: '',
			save: mocks.save
		};
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRecoveryRequest('user@example.com')
		} as any);

		expect(response.status).toBe(200);
		expect(user.resetPasswordTokenHash).toBe(hashPasswordResetToken('plain-reset-token'));
		expect(user.resetPasswordTokenHash).not.toBe('plain-reset-token');
		expect(user.resetPasswordExpiresAt).toEqual(new Date('2026-07-10T13:00:00.000Z'));
		expect(user.save).toHaveBeenCalled();

		// The raw token is only ever exposed in the emailed reset URL, never persisted.
		expect(mocks.buildPasswordResetEmailHtml).toHaveBeenCalledWith(
			'Ada',
			'https://sciledger.online/reset?token=plain-reset-token'
		);
	});

	it('normalizes the requested email (trim + lowercase) before looking up the user', async () => {
		mocks.findOne.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRecoveryRequest('  User@EXAMPLE.com  ')
		} as any);

		expect(response.status).toBe(200);
		expect(mocks.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
	});
});
