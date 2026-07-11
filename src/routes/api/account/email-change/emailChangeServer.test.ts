import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashEmailChangeToken } from '$lib/server/auth/emailChange';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn(),
	sendEmailChangeConfirmation: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.findOne
	}
}));

vi.mock('$lib/server/auth/emailChange', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/auth/emailChange')>(
		'$lib/server/auth/emailChange'
	);

	return {
		...actual,
		sendEmailChangeConfirmation: mocks.sendEmailChangeConfirmation
	};
});

function createRequestEvent(body: unknown, authenticated = true) {
	return {
		request: { json: async () => body },
		url: new URL('https://sciledger.online/api/account/email-change'),
		locals: authenticated ? { user: { id: 'user-1', email: 'old@example.com' } } : {}
	} as any;
}

function createCurrentUser(overrides: Record<string, unknown> = {}) {
	return {
		id: 'user-1',
		email: 'old@example.com',
		firstName: 'Ada',
		pendingEmail: undefined as string | undefined,
		pendingEmailTokenHash: undefined as string | undefined,
		pendingEmailExpiresAt: undefined as Date | undefined,
		pendingEmailLastSentAt: undefined as Date | undefined,
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('POST /api/account/email-change', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.sendEmailChangeConfirmation.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ email: 'new@example.com' }, false));

		expect(response.status).toBe(401);
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('sets only a pending email change, never User.email directly, and stores only the token hash', async () => {
		const user = createCurrentUser();
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('email' in query) return null; // uniqueness check: nobody else has it
			return user; // current-user lookup
		});
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ email: 'new@example.com' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(user.email).toBe('old@example.com'); // untouched
		expect(user.pendingEmail).toBe('new@example.com');
		expect(user.pendingEmailTokenHash).toHaveLength(64);
		expect(user.pendingEmailExpiresAt).toBeInstanceOf(Date);
		expect(user.save).toHaveBeenCalled();

		expect(mocks.sendEmailChangeConfirmation).toHaveBeenCalledTimes(1);
		const sentArgs = mocks.sendEmailChangeConfirmation.mock.calls[0][0];
		expect(sentArgs.to).toBe('new@example.com');
		const sentToken = new URL(sentArgs.confirmationUrl).searchParams.get('token')!;
		expect(hashEmailChangeToken(sentToken)).toBe(user.pendingEmailTokenHash);
	});

	it('normalizes (trim + lowercase) the requested email', async () => {
		const user = createCurrentUser();
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('email' in query) return null;
			return user;
		});
		const { POST } = await import('./+server');

		await POST(createRequestEvent({ email: '  New@Example.com  ' }));

		expect(user.pendingEmail).toBe('new@example.com');
	});

	it('rejects a new email identical to the current one', async () => {
		const user = createCurrentUser();
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ email: 'OLD@example.com' }));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/different/i);
		expect(user.save).not.toHaveBeenCalled();
		expect(mocks.sendEmailChangeConfirmation).not.toHaveBeenCalled();
	});

	it('rejects a duplicate email already used by another account', async () => {
		const user = createCurrentUser();
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('email' in query) return { id: 'someone-else', email: 'new@example.com' };
			return user;
		});
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ email: 'new@example.com' }));
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body.error).toMatch(/already in use/i);
		expect(user.save).not.toHaveBeenCalled();
		expect(mocks.sendEmailChangeConfirmation).not.toHaveBeenCalled();
	});

	it('overwrites a previous pending request when a new change is requested', async () => {
		const user = createCurrentUser({
			pendingEmail: 'first-attempt@example.com',
			pendingEmailTokenHash: 'stale-hash-from-earlier-request',
			pendingEmailExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
			pendingEmailLastSentAt: new Date('2026-07-10T11:00:00.000Z')
		});
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('email' in query) return null;
			return user;
		});
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ email: 'second-attempt@example.com' }));

		expect(response.status).toBe(200);
		expect(user.pendingEmail).toBe('second-attempt@example.com');
		expect(user.pendingEmailTokenHash).not.toBe('stale-hash-from-earlier-request');
	});
});
