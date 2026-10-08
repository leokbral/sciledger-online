import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashOrcidSignupToken } from '$lib/server/auth/orcidSignupClaim';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	claimFindOne: vi.fn(),
	sendConfirmation: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	SITE_URL: 'https://sciledger.online'
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/OrcidSignupClaim', () => ({
	default: { findOne: (...args: any[]) => mocks.claimFindOne(...args) }
}));

vi.mock('$lib/server/auth/orcidSignupClaim', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/auth/orcidSignupClaim')>(
		'$lib/server/auth/orcidSignupClaim'
	);

	return {
		...actual,
		sendOrcidSignupConfirmation: mocks.sendConfirmation
	};
});

// `null` is the no-cookie sentinel on purpose: passing `undefined` to a
// defaulted parameter triggers the default, which would silently keep the
// cookie present and make the refusal test pass for the wrong reason.
function createEvent(body: unknown, claimId: string | null = 'claim-1') {
	return {
		request: { json: async () => body },
		cookies: { get: () => claimId ?? undefined }
	} as any;
}

function makeClaim(overrides: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		orcid: '0000-0001-0002-0003',
		firstName: 'Ada',
		lastName: 'Lovelace',
		pendingEmail: undefined as string | undefined,
		tokenHash: undefined as string | undefined,
		expiresAt: new Date(Date.now() + 60_000),
		updatedAt: new Date(0),
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('POST /orcid/email', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.sendConfirmation.mockResolvedValue(undefined);
	});

	it('stores only the hash and mails the raw token in the confirmation link', async () => {
		const claim = makeClaim();
		mocks.claimFindOne.mockResolvedValue(claim);
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ email: '  Ada@Example.COM  ' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ success: true, email: 'ada@example.com' });
		// Normalized before anything is written.
		expect(claim.pendingEmail).toBe('ada@example.com');
		expect(claim.save).toHaveBeenCalled();

		const [{ to, confirmationUrl }] = mocks.sendConfirmation.mock.calls[0];
		expect(to).toBe('ada@example.com');

		// The link carries the raw token; the stored hash matches it, and the
		// raw token itself is never persisted.
		const token = new URL(confirmationUrl).searchParams.get('token') ?? '';
		expect(token).not.toBe('');
		expect(claim.tokenHash).toBe(hashOrcidSignupToken(token));
		expect(claim.tokenHash).not.toBe(token);
	});

	it('cannot leak whether the address already has an account', async () => {
		// The guarantee is structural: this endpoint never queries the user
		// collection, so there is nothing for it to leak. Which outcome applies
		// -- link an existing account or create one -- is decided later, by
		// /orcid/confirm, behind the e-mailed link.
		const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '+server.ts'), 'utf8');
		expect(source).not.toContain('models/User');

		const claim = makeClaim();
		mocks.claimFindOne.mockResolvedValue(claim);
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ email: 'someone@example.com' }));

		// The body carries the address back and nothing else -- the same shape
		// whoever owns it.
		expect(await response.json()).toEqual({ success: true, email: 'someone@example.com' });
	});

	it('rejects an invalid address without touching the claim', async () => {
		const claim = makeClaim();
		mocks.claimFindOne.mockResolvedValue(claim);
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ email: 'not-an-email' }));

		expect(response.status).toBe(400);
		expect(claim.save).not.toHaveBeenCalled();
		expect(mocks.sendConfirmation).not.toHaveBeenCalled();
	});

	it('refuses the placeholder domain, which has no mailbox', async () => {
		const claim = makeClaim();
		mocks.claimFindOne.mockResolvedValue(claim);
		const { POST } = await import('./+server');

		const response = await POST(
			createEvent({ email: '0000-0001-0002-0003@orcid.placeholder' })
		);

		expect(response.status).toBe(400);
		expect(mocks.sendConfirmation).not.toHaveBeenCalled();
	});

	it('refuses when the browser carries no claim cookie', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ email: 'ada@example.com' }, null));

		expect(response.status).toBe(440);
		expect(mocks.claimFindOne).not.toHaveBeenCalled();
	});

	it('refuses an expired claim', async () => {
		mocks.claimFindOne.mockResolvedValue(
			makeClaim({ expiresAt: new Date(Date.now() - 1000) })
		);
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ email: 'ada@example.com' }));

		expect(response.status).toBe(440);
		expect(mocks.sendConfirmation).not.toHaveBeenCalled();
	});

	it('reports a send failure without leaking the internal error', async () => {
		mocks.claimFindOne.mockResolvedValue(makeClaim());
		mocks.sendConfirmation.mockRejectedValue(
			new Error('getaddrinfo ENOTFOUND smtp.example.com')
		);
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ email: 'ada@example.com' }));
		const body = await response.json();

		expect(response.status).toBe(502);
		expect(JSON.stringify(body)).not.toMatch(/ENOTFOUND|smtp\.example\.com/);
	});
});
