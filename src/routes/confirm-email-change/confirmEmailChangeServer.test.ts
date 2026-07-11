import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashEmailChangeToken } from '$lib/server/auth/emailChange';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn(),
	sendEmailChangedNotification: vi.fn(),
	revokeAllUserSessions: vi.fn()
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
		sendEmailChangedNotification: mocks.sendEmailChangedNotification
	};
});

vi.mock('$lib/server/auth/SessionService', () => ({
	revokeAllUserSessions: mocks.revokeAllUserSessions
}));

function createRequestEvent(token?: string) {
	const url = new URL('https://sciledger.online/confirm-email-change');
	if (token) url.searchParams.set('token', token);
	return { url } as any;
}

function createPendingUser(token: string, overrides: Record<string, unknown> = {}) {
	return {
		id: 'user-1',
		email: 'old@example.com',
		firstName: 'Ada',
		emailVerified: true,
		emailVerifiedAt: undefined as Date | undefined,
		pendingEmail: 'new@example.com',
		pendingEmailTokenHash: hashEmailChangeToken(token),
		pendingEmailExpiresAt: new Date('2026-07-11T12:00:00.000Z'),
		pendingEmailLastSentAt: new Date('2026-07-10T12:00:00.000Z'),
		updatedAt: '',
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('GET /confirm-email-change', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.sendEmailChangedNotification.mockResolvedValue(undefined);
		mocks.revokeAllUserSessions.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
	});

	it('requires a token', async () => {
		const { GET } = await import('./+server');

		const response = await GET(createRequestEvent());
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeTruthy();
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('rejects an invalid (unknown) token', async () => {
		mocks.findOne.mockResolvedValue(null);
		const { GET } = await import('./+server');

		const response = await GET(createRequestEvent('bogus-token'));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/invalid or has expired/i);
	});

	it('rejects an expired token', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-11T13:00:00.000Z')); // 1h after the token's expiry
		const token = 'expired-token';
		const user = createPendingUser(token, {
			pendingEmailExpiresAt: new Date('2026-07-11T12:00:00.000Z')
		});
		mocks.findOne.mockResolvedValue(user);
		const { GET } = await import('./+server');

		const response = await GET(createRequestEvent(token));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/invalid or has expired/i);
		expect(user.save).not.toHaveBeenCalled();
		expect(mocks.sendEmailChangedNotification).not.toHaveBeenCalled();
		expect(mocks.revokeAllUserSessions).not.toHaveBeenCalled();
	});

	it('applies the change, clears pending fields, keeps emailVerified true, and notifies the OLD address', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T13:00:00.000Z')); // before expiry
		const token = 'valid-token';
		const user = createPendingUser(token, { emailVerified: false });
		// No collision: the uniqueness re-check finds no other account with pendingEmail.
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('pendingEmailTokenHash' in query) return user;
			if ('email' in query) return null; // collision check
			return null;
		});
		const { GET } = await import('./+server');

		const response = await GET(createRequestEvent(token));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.email).toBe('new@example.com');

		expect(user.email).toBe('new@example.com');
		expect(user.emailVerified).toBe(true);
		expect(user.emailVerifiedAt).toBeInstanceOf(Date);
		expect(user.pendingEmail).toBeUndefined();
		expect(user.pendingEmailTokenHash).toBeUndefined();
		expect(user.pendingEmailExpiresAt).toBeUndefined();
		expect(user.pendingEmailLastSentAt).toBeUndefined();
		expect(user.save).toHaveBeenCalled();

		// Audit notification goes to the OLD address, not the new one.
		expect(mocks.sendEmailChangedNotification).toHaveBeenCalledWith({
			to: 'old@example.com',
			firstName: 'Ada',
			newEmail: 'new@example.com'
		});

		// Changing the primary email forces every device to re-authenticate,
		// the same as password reset.
		expect(mocks.revokeAllUserSessions).toHaveBeenCalledWith('user-1', 'email_change');
	});

	it('revokes all sessions only after a successful confirmation, never on a rejected attempt', async () => {
		mocks.findOne.mockResolvedValue(null);
		const { GET } = await import('./+server');

		await GET(createRequestEvent('bogus-token'));

		expect(mocks.revokeAllUserSessions).not.toHaveBeenCalled();
	});

	it('rejects a reused token after it has already been consumed', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T13:00:00.000Z'));
		const token = 'one-time-token';
		const user = createPendingUser(token);
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('pendingEmailTokenHash' in query) return user;
			if ('email' in query) return null;
			return null;
		});
		const { GET } = await import('./+server');

		const first = await GET(createRequestEvent(token));
		expect(first.status).toBe(200);

		// Once consumed, pendingEmailTokenHash is cleared -- a second lookup for
		// the same hash now finds nothing, simulating a real DB re-query.
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('pendingEmailTokenHash' in query) return null;
			return null;
		});

		const second = await GET(createRequestEvent(token));
		const secondBody = await second.json();

		expect(second.status).toBe(400);
		expect(secondBody.error).toMatch(/invalid or has expired/i);
	});

	it('rejects the confirmation if the pending email was claimed by another account in the meantime', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T13:00:00.000Z'));
		const token = 'valid-token';
		const user = createPendingUser(token);
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('pendingEmailTokenHash' in query) return user;
			if ('email' in query) return { id: 'someone-else', email: 'new@example.com' };
			return null;
		});
		const { GET } = await import('./+server');

		const response = await GET(createRequestEvent(token));
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body.error).toMatch(/no longer available/i);
		expect(user.email).toBe('old@example.com'); // unchanged
		expect(user.save).not.toHaveBeenCalled();
		expect(mocks.revokeAllUserSessions).not.toHaveBeenCalled();
	});

	it('does not fail the confirmation if sending the audit notification throws', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T13:00:00.000Z'));
		const token = 'valid-token';
		const user = createPendingUser(token);
		mocks.findOne.mockImplementation(async (query: Record<string, unknown>) => {
			if ('pendingEmailTokenHash' in query) return user;
			if ('email' in query) return null;
			return null;
		});
		mocks.sendEmailChangedNotification.mockRejectedValue(new Error('SMTP down'));
		const { GET } = await import('./+server');

		const response = await GET(createRequestEvent(token));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(user.email).toBe('new@example.com');
	});
});
