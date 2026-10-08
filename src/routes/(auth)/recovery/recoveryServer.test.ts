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

function createUser(overrides: Record<string, unknown> = {}) {
	return {
		email: 'user@example.com',
		firstName: 'Ada',
		resetPasswordTokenHash: undefined as string | undefined,
		resetPasswordExpiresAt: undefined as Date | undefined,
		updatedAt: '',
		save: mocks.save,
		...overrides
	};
}

/**
 * ORCID iDs sao publicos, entao qualquer um pode montar
 * `<orcid>@orcid.placeholder` e submeter em /recovery. Se a resposta para esse
 * endereco diferir da de uma conta inexistente, isso vira um oraculo de
 * enumeracao alimentado por dado publico. A resposta tem de ser identica.
 */
describe('password recovery for ORCID placeholder accounts', () => {
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

	it('returns the uniform success response without sending mail or saving a token', async () => {
		const user = createUser({ email: '0000-0001-0002-0003@orcid.placeholder' });
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRecoveryRequest('0000-0001-0002-0003@orcid.placeholder')
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ message: 'success' });
		expect(mocks.sendMail).not.toHaveBeenCalled();
		// Nenhum token gravado: antes, o save acontecia ANTES do envio, deixando
		// um token valido e inutilizavel e acionando o rate-limit em silencio.
		expect(mocks.save).not.toHaveBeenCalled();
		expect(user.resetPasswordTokenHash).toBeUndefined();
		expect(user.resetPasswordExpiresAt).toBeUndefined();
		expect(mocks.generatePasswordResetToken).not.toHaveBeenCalled();
	});

	it('is byte-for-byte indistinguishable from the response for an account that does not exist', async () => {
		// O relay recusa um destinatario cujo dominio nao existe. Sem o desvio,
		// o envio estoura, cai no catch e devolve 500 -- enquanto uma conta
		// inexistente devolve 200. Essa diferenca e o oraculo de enumeracao, e
		// ORCID iDs sao publicos, entao qualquer um pode consultar.
		mocks.sendMail.mockRejectedValue(new Error('550 recipient domain not found'));

		const { POST: PostForPlaceholder } = await import('./+server');
		mocks.findOne.mockResolvedValue(createUser({ email: '0000-0001-0002-0003@orcid.placeholder' }));
		const placeholderResponse = await PostForPlaceholder({
			request: createRecoveryRequest('0000-0001-0002-0003@orcid.placeholder')
		} as any);
		const placeholderBody = await placeholderResponse.text();

		vi.resetModules();
		mocks.findOne.mockResolvedValue(null);
		const { POST: PostForMissing } = await import('./+server');
		const missingResponse = await PostForMissing({
			request: createRecoveryRequest('nobody@example.com')
		} as any);
		const missingBody = await missingResponse.text();

		expect(placeholderResponse.status).toBe(missingResponse.status);
		expect(placeholderBody).toBe(missingBody);
	});

	it('still issues a token and sends mail for an account with a real address', async () => {
		const user = createUser();
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRecoveryRequest('user@example.com')
		} as any);

		expect(response.status).toBe(200);
		expect(mocks.save).toHaveBeenCalled();
		expect(user.resetPasswordTokenHash).toBe(hashPasswordResetToken('plain-reset-token'));
		expect(mocks.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'user@example.com' })
		);
	});
});

describe('password recovery error responses', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.model.mockReturnValue({ findOne: mocks.findOne });
		mocks.generatePasswordResetToken.mockReturnValue('plain-reset-token');
		mocks.getPasswordResetExpiresAt.mockReturnValue(new Date('2026-07-10T13:00:00.000Z'));
		mocks.buildPasswordResetEmailHtml.mockReturnValue('<html></html>');
		mocks.verify.mockResolvedValue(undefined);
		mocks.createTransport.mockReturnValue({
			verify: mocks.verify,
			sendMail: mocks.sendMail
		});
	});

	it('never leaks the internal error message to the client', async () => {
		mocks.findOne.mockResolvedValue(createUser());
		mocks.sendMail.mockRejectedValue(new Error('getaddrinfo ENOTFOUND smtp.example.com'));
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRecoveryRequest('user@example.com')
		} as any);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
		expect(body).not.toHaveProperty('details');
		expect(JSON.stringify(body)).not.toMatch(/ENOTFOUND|smtp\.example\.com/);
	});
});
