import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashOrcidSignupToken } from '$lib/server/auth/orcidSignupClaim';

const mocks = vi.hoisted(() => {
	const instances: any[] = [];

	function UserModel(this: any, data: Record<string, unknown>) {
		Object.assign(this, data);
		this.save = vi.fn().mockResolvedValue(undefined);
		instances.push(this);
	}

	return {
		instances,
		userFindOne: vi.fn(),
		startMongo: vi.fn(),
		respondWithSession: vi.fn(),
		claimFindOne: vi.fn(),
		claimDeleteOne: vi.fn(),
		UserModel
	};
});

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => {
	(mocks.UserModel as unknown as { findOne: typeof mocks.userFindOne }).findOne = mocks.userFindOne;
	return { default: mocks.UserModel };
});

vi.mock('$lib/db/models/OrcidSignupClaim', () => ({
	default: {
		findOne: (...args: any[]) => mocks.claimFindOne(...args),
		deleteOne: (...args: any[]) => mocks.claimDeleteOne(...args)
	}
}));

vi.mock('$lib/server/auth/authResponse', () => ({
	respondWithSession: mocks.respondWithSession
}));

const TOKEN = 'plain-signup-token';
const ORCID = '0000-0001-0002-0003';

function createEvent(token: string | null = TOKEN) {
	const url = new URL(
		token === null
			? 'https://sciledger.online/orcid/confirm'
			: `https://sciledger.online/orcid/confirm?token=${encodeURIComponent(token)}`
	);
	return { url, request: new Request(url) };
}

function makeClaim(overrides: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		orcid: ORCID,
		firstName: 'Ada',
		lastName: 'Lovelace',
		pendingEmail: 'ada@example.com',
		tokenHash: hashOrcidSignupToken(TOKEN),
		expiresAt: new Date(Date.now() + 60_000),
		...overrides
	};
}

async function callGet(event: any) {
	const { GET } = await import('./+server');
	try {
		return { response: await GET(event), redirect: null as any };
	} catch (thrown: any) {
		// SvelteKit `redirect()` throws; surface it instead of failing the test.
		return { response: null as any, redirect: thrown };
	}
}

/**
 * Opening the confirmation link is the proof of ownership that an ORCID record
 * without a public e-mail could not give. These tests pin the two outcomes it
 * decides between -- link to the account that already holds the address, or
 * create one -- plus the refusals.
 */
describe('GET /orcid/confirm', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mocks.instances.length = 0;
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.claimDeleteOne.mockResolvedValue({ deletedCount: 1 });
		mocks.respondWithSession.mockResolvedValue(
			new Response(null, { headers: { 'set-cookie': 'session=token' } })
		);
	});

	it('attaches the ORCID iD to the account that already holds the address', async () => {
		const existing = {
			id: 'user-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			orcid: undefined as string | undefined,
			emailVerified: false,
			emailVerifiedAt: undefined as Date | undefined,
			verificationSource: 'register',
			updatedAt: '',
			save: vi.fn().mockResolvedValue(undefined)
		};
		mocks.claimFindOne.mockResolvedValue(makeClaim());
		// 1st: no account carries this ORCID yet. 2nd: the address is taken.
		mocks.userFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);

		const { response } = await callGet(createEvent());

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('/');
		// Linked, not merged: no new account, nothing else overwritten.
		expect(mocks.instances).toHaveLength(0);
		expect(existing.orcid).toBe(ORCID);
		expect(existing.emailVerified).toBe(true);
		expect(existing.emailVerifiedAt).toBeInstanceOf(Date);
		expect(existing.verificationSource).toBe('orcid_email_confirmed');
		expect(existing.save).toHaveBeenCalled();
		// The claim is consumed, so the link cannot be replayed.
		expect(mocks.claimDeleteOne).toHaveBeenCalledWith({ id: 'claim-1' });
	});

	it('creates the account with the confirmed address when nothing holds it', async () => {
		mocks.claimFindOne.mockResolvedValue(makeClaim());
		// No ORCID match, no email match, and the username is free.
		mocks.userFindOne.mockResolvedValue(null);

		const { response } = await callGet(createEvent());

		const created = mocks.instances[0];
		expect(response.headers.get('location')).toBe('/complete-profile');
		expect(created.email).toBe('ada@example.com');
		expect(created.orcid).toBe(ORCID);
		expect(created.emailVerified).toBe(true);
		expect(created.verificationSource).toBe('orcid_email_confirmed');
		// No invented address anywhere in the record.
		expect(created.email).not.toContain('orcid.placeholder');
		// And no ORCID secrets parked in the claim ever reach the account.
		expect(created.orcidAccessToken).toBeUndefined();
		expect(created.orcidRefreshToken).toBeUndefined();
		expect(created.save).toHaveBeenCalled();
		expect(mocks.claimDeleteOne).toHaveBeenCalledWith({ id: 'claim-1' });
	});

	it('finds the claim by the hash of the token, never by the token itself', async () => {
		mocks.claimFindOne.mockResolvedValue(makeClaim());
		mocks.userFindOne.mockResolvedValue(null);

		await callGet(createEvent());

		expect(mocks.claimFindOne).toHaveBeenCalledWith({
			tokenHash: hashOrcidSignupToken(TOKEN)
		});
		expect(JSON.stringify(mocks.claimFindOne.mock.calls)).not.toContain(TOKEN);
	});

	it('refuses an expired claim without creating anything', async () => {
		mocks.claimFindOne.mockResolvedValue(
			makeClaim({ expiresAt: new Date(Date.now() - 1000) })
		);

		const { redirect } = await callGet(createEvent());

		expect(redirect?.status).toBe(302);
		expect(redirect?.location).toBe('/login?error=orcid_confirm_expired');
		expect(mocks.instances).toHaveLength(0);
	});

	it('refuses an unknown token', async () => {
		mocks.claimFindOne.mockResolvedValue(null);

		const { redirect } = await callGet(createEvent('wrong-token'));

		expect(redirect?.location).toBe('/login?error=orcid_confirm_expired');
		expect(mocks.instances).toHaveLength(0);
	});

	it('refuses a request with no token at all', async () => {
		const { redirect } = await callGet(createEvent(null));

		expect(redirect?.location).toBe('/login?error=orcid_confirm_invalid');
		expect(mocks.claimFindOne).not.toHaveBeenCalled();
	});

	it('just signs the person in when the ORCID iD was linked meanwhile', async () => {
		const alreadyLinked = {
			id: 'user-9',
			email: 'ada@example.com',
			orcid: ORCID,
			save: vi.fn().mockResolvedValue(undefined)
		};
		mocks.claimFindOne.mockResolvedValue(makeClaim());
		mocks.userFindOne.mockResolvedValueOnce(alreadyLinked);

		const { response } = await callGet(createEvent());

		expect(response.headers.get('location')).toBe('/');
		expect(mocks.instances).toHaveLength(0);
		expect(mocks.claimDeleteOne).toHaveBeenCalledWith({ id: 'claim-1' });
	});
});
