import { beforeEach, describe, expect, it, vi } from 'vitest';

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
		respondWithSession: vi.fn(),
		UserModel
	};
});

vi.mock('$env/static/private', () => ({
	ORCID_CLIENT_ID: 'client-id',
	ORCID_CLIENT_SECRET: 'client-secret',
	ORCID_REDIRECT_URI: 'https://sciledger.online/orcid/callback'
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		ORCID_SANDBOX: 'false'
	}
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

vi.mock('$lib/server/auth/authResponse', () => ({
	respondWithSession: mocks.respondWithSession
}));

function createEvent() {
	const url = new URL('https://sciledger.online/orcid/callback?code=authorization-code');
	const request = new Request(url);
	return { url, request };
}

function mockFetchPerson(person: Record<string, unknown>) {
	vi.stubGlobal(
		'fetch',
		vi.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					access_token: 'access-token',
					refresh_token: 'refresh-token',
					expires_in: 3600,
					orcid: '0000-0001-0002-0003',
					name: 'Ada Lovelace'
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => person
			})
	);
}

describe('ORCID callback email verification policy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		mocks.instances.length = 0;
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.respondWithSession.mockResolvedValue(new Response(null, { headers: { 'set-cookie': 'session=token' } }));
	});

	it('creates a verified user when ORCID returns a public email', async () => {
		mocks.findOne.mockResolvedValue(null);
		mockFetchPerson({
			name: {
				'given-names': { value: 'Ada' },
				'family-name': { value: 'Lovelace' }
			},
			emails: {
				email: [{ email: 'ada@example.com', primary: true }]
			}
		});
		const { GET } = await import('./+server');

		const response = await GET(createEvent() as any);
		const user = mocks.instances[0];

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('/');
		expect(user.email).toBe('ada@example.com');
		expect(user.emailVerified).toBe(true);
		expect(user.emailVerifiedAt).toBeInstanceOf(Date);
		expect(user.verificationSource).toBe('orcid');
		expect(user.save).toHaveBeenCalled();
	});

	it('creates an unverified placeholder user when ORCID has no public email', async () => {
		mocks.findOne.mockResolvedValue(null);
		mockFetchPerson({
			name: {
				'given-names': { value: 'Ada' },
				'family-name': { value: 'Lovelace' }
			},
			emails: {
				email: []
			}
		});
		const { GET } = await import('./+server');

		const response = await GET(createEvent() as any);
		const user = mocks.instances[0];

		expect(response.status).toBe(302);
		// Conta nova: `profileCompletedAt` ainda nao existe, por isso o desvio --
		// nao por causa do e-mail placeholder.
		expect(response.headers.get('location')).toBe('/complete-profile');
		expect(user.profileCompletedAt).toBeUndefined();
		expect(user.email).toBe('0000-0001-0002-0003@orcid.placeholder');
		expect(user.emailVerified).toBe(false);
		expect(user.emailVerifiedAt).toBeUndefined();
		expect(user.verificationSource).toBe('orcid_placeholder');
		expect(user.save).toHaveBeenCalled();
	});
});

function mockExistingOrcidUser(overrides: Record<string, unknown> = {}) {
	const user = {
		orcid: '0000-0001-0002-0003',
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: '0000-0001-0002-0003@orcid.placeholder',
		profileCompletedAt: undefined as Date | undefined,
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
	mocks.findOne.mockResolvedValue(user);
	return user;
}

function mockAdaPerson() {
	mockFetchPerson({
		name: {
			'given-names': { value: 'Ada' },
			'family-name': { value: 'Lovelace' }
		},
		emails: {
			email: []
		}
	});
}

/**
 * O e-mail nao pode mais ser o unico portao de `isProfileComplete`. Contas ORCID
 * sem e-mail publico ficam com `<orcid>@orcid.placeholder`, e /complete-profile
 * nao troca e-mail (o POST rejeita o campo com 400), entao exigir um endereco
 * real prendia essas contas em /complete-profile a cada login.
 */
describe('ORCID callback post-login redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		mocks.instances.length = 0;
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.respondWithSession.mockResolvedValue(
			new Response(null, { headers: { 'set-cookie': 'session=token' } })
		);
	});

	it('sends a placeholder-email user who already completed the profile to the home page', async () => {
		mockExistingOrcidUser({ profileCompletedAt: new Date('2026-01-01T00:00:00.000Z') });
		mockAdaPerson();
		const { GET } = await import('./+server');

		const response = await GET(createEvent() as any);

		// Antes da correcao isto era '/complete-profile' em todo login, para sempre.
		expect(response.headers.get('location')).toBe('/');
	});

	it('still sends a placeholder-email user who never completed the profile to /complete-profile', async () => {
		mockExistingOrcidUser();
		mockAdaPerson();
		const { GET } = await import('./+server');

		const response = await GET(createEvent() as any);

		expect(response.headers.get('location')).toBe('/complete-profile');
	});

	it('sends a legacy account with a real email but no profileCompletedAt to the home page', async () => {
		// Conta criada por e-mail/senha que agora vincula o ORCID: nunca passou por
		// /complete-profile, mas o perfil esta completo de fato.
		mockExistingOrcidUser({ email: 'ada@example.com' });
		mockAdaPerson();
		const { GET } = await import('./+server');

		const response = await GET(createEvent() as any);

		expect(response.headers.get('location')).toBe('/');
	});

	it('requires a real name regardless of profileCompletedAt', async () => {
		// Fallback do callback quando o ORCID nao expoe nome algum.
		mockExistingOrcidUser({
			firstName: 'User',
			lastName: 'ORCID',
			email: 'ada@example.com',
			profileCompletedAt: new Date('2026-01-01T00:00:00.000Z')
		});
		mockAdaPerson();
		const { GET } = await import('./+server');

		const response = await GET(createEvent() as any);

		expect(response.headers.get('location')).toBe('/complete-profile');
	});
});
