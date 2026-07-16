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

function createRequestEvent(authenticated = true) {
	return {
		url: new URL('https://sciledger.online/api/account/email-change/resend'),
		locals: authenticated ? { user: { id: 'user-1' } } : {}
	} as any;
}

function createCurrentUser(overrides: Record<string, unknown> = {}) {
	return {
		id: 'user-1',
		email: 'old@example.com',
		firstName: 'Ada',
		pendingEmail: 'new@example.com',
		pendingEmailTokenHash: 'previous-hash',
		pendingEmailExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
		pendingEmailLastSentAt: new Date('2026-07-10T11:58:00.000Z'),
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('POST /api/account/email-change/resend', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		mocks.startMongo.mockResolvedValue(undefined);
		mocks.sendEmailChangeConfirmation.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent(false));

		expect(response.status).toBe(401);
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('rejects when there is no pending email change', async () => {
		const user = createCurrentUser({ pendingEmail: undefined, pendingEmailTokenHash: undefined });
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent());
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toMatch(/no pending email change/i);
		expect(mocks.sendEmailChangeConfirmation).not.toHaveBeenCalled();
	});

	it('enforces the 60 second cooldown', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
		const user = createCurrentUser({ pendingEmailLastSentAt: new Date('2026-07-10T11:59:30.000Z') });
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent());
		const body = await response.json();

		expect(response.status).toBe(429);
		expect(body.retryAfterSeconds).toBe(30);
		expect(user.save).not.toHaveBeenCalled();
		expect(mocks.sendEmailChangeConfirmation).not.toHaveBeenCalled();
	});

	it('renews the token hash, resends the email, and updates the cooldown timestamp once it has elapsed', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
		const user = createCurrentUser({ pendingEmailLastSentAt: new Date('2026-07-10T11:58:00.000Z') });
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent());
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(user.pendingEmailTokenHash).not.toBe('previous-hash');
		expect(user.pendingEmailLastSentAt).toEqual(new Date('2026-07-10T12:00:00.000Z'));
		expect(user.save).toHaveBeenCalled();

		const sentArgs = mocks.sendEmailChangeConfirmation.mock.calls[0][0];
		expect(sentArgs.to).toBe('new@example.com');
		const sentToken = new URL(sentArgs.confirmationUrl).searchParams.get('token')!;
		expect(hashEmailChangeToken(sentToken)).toBe(user.pendingEmailTokenHash);
	});
});
