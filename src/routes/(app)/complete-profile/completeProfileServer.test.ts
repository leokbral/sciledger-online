import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.findOne
	}
}));

function createRequestEvent(body: unknown) {
	return {
		request: { json: async () => body },
		locals: { user: { id: 'user-1' } }
	} as any;
}

function createPlaceholderUser(overrides: Record<string, unknown> = {}) {
	return {
		id: 'user-1',
		email: '0000-0001-0002-0003@orcid.placeholder',
		firstName: 'User',
		lastName: 'ORCID',
		country: '',
		dob: '',
		profileCompletedAt: undefined as Date | undefined,
		pendingEmail: undefined as string | undefined,
		pendingEmailTokenHash: undefined as string | undefined,
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('POST /complete-profile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('updates only profile fields, never touching email or pending-email state', async () => {
		const user = createPlaceholderUser();
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST(
			createRequestEvent({
				firstName: 'Ada',
				lastName: 'Lovelace',
				country: 'BR',
				dob: '1815-12-10'
			})
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(user.firstName).toBe('Ada');
		expect(user.lastName).toBe('Lovelace');
		expect(user.country).toBe('BR');
		expect(user.dob).toBe('1815-12-10');
		expect(user.profileCompletedAt).toBeInstanceOf(Date);
		// Untouched -- this endpoint has no email-change logic anymore.
		expect(user.email).toBe('0000-0001-0002-0003@orcid.placeholder');
		expect(user.pendingEmail).toBeUndefined();
		expect(user.pendingEmailTokenHash).toBeUndefined();
	});

	it('rejects the request with a clear error when an email field is supplied', async () => {
		const { POST } = await import('./+server');

		const response = await POST(
			createRequestEvent({
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: 'ada@example.com'
			})
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/api\/account\/email-change/i);
		// Rejected before ever touching the database.
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('treats a whitespace-only email as absent rather than rejecting the request', async () => {
		const user = createPlaceholderUser();
		mocks.findOne.mockResolvedValue(user);
		const { POST } = await import('./+server');

		const response = await POST(
			createRequestEvent({
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: '   '
			})
		);
		const body = await response.json();

		// Falls through to the normal profile-update path instead of the
		// "email changes not supported here" rejection.
		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(user.email).toBe('0000-0001-0002-0003@orcid.placeholder');
	});

	it('requires firstName and lastName without requiring email', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ firstName: 'Ada' }));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.message).toMatch(/nome e sobrenome/i);
	});
});
