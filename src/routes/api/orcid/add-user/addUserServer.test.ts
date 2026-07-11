import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function createOrcidProfile(email?: string) {
	return {
		person: {
			name: {
				'given-names': { value: 'Ada' },
				'family-name': { value: 'Lovelace' }
			},
			biography: { content: 'Mathematician' },
			emails: {
				email: email ? [{ email, primary: true }] : []
			},
			addresses: {
				address: [{ country: { value: 'GB' } }]
			}
		},
		'orcid-identifier': {
			path: '0000-0001-0002-0003'
		},
		'activities-summary': {
			employments: {
				'affiliation-group': [
					{
						summaries: [
							{
								'employment-summary': {
									organization: { name: 'Analytical Engine Lab' },
									'role-title': 'Researcher'
								}
							}
						]
					}
				]
			}
		}
	};
}

function createRequest(body: Record<string, unknown>) {
	return new Request('https://sciledger.online/api/orcid/add-user', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});
}

describe('ORCID co-author user creation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.instances.length = 0;
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.findOne.mockResolvedValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('requires an authenticated creator', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({ orcidProfile: createOrcidProfile('ada@example.com') }),
			locals: {}
		} as any);

		expect(response.status).toBe(401);
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('uses PBKDF2 password hashing and marks public ORCID email as verified', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({ orcidProfile: createOrcidProfile('ada@example.com') }),
			locals: { user: { id: 'creator-1' } }
		} as any);
		const body = await response.json();
		const user = mocks.instances[0];

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(user.email).toBe('ada@example.com');
		expect(user.password).toBe(
			crypto.pbkdf2Sync(body.tempPassword, 'test-secret', 1000, 64, 'sha512').toString('hex')
		);
		expect(user.password).not.toMatch(/^\$2[aby]\$/);
		expect(user.emailVerified).toBe(true);
		expect(user.emailVerifiedAt).toBeInstanceOf(Date);
		expect(user.verificationSource).toBe('orcid');
	});

	it('keeps manually supplied co-author email unverified when ORCID has no public email', async () => {
		const { POST } = await import('./+server');

		const response = await POST({
			request: createRequest({
				orcidProfile: createOrcidProfile(),
				email: 'manual@example.com'
			}),
			locals: { user: { id: 'creator-1' } }
		} as any);
		const user = mocks.instances[0];

		expect(response.status).toBe(200);
		expect(user.email).toBe('manual@example.com');
		expect(user.emailVerified).toBe(false);
		expect(user.emailVerifiedAt).toBeUndefined();
		expect(user.verificationSource).toBeUndefined();
	});
});
