import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findOne: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/db/models/User', () => ({
	default: { findOne: mocks.findOne }
}));

function leanOne(row: any) {
	return { select: () => ({ lean: async () => row }) };
}

function postEvent(body: unknown, userId: string | null = 'user-1') {
	return {
		request: { json: async () => body },
		locals: userId ? { user: { id: userId } } : {}
	} as any;
}

function getEvent(value: string | null, userId: string | null = 'user-1') {
	return {
		url: new URL(
			value === null
				? 'https://sciledger.online/api/account/username'
				: `https://sciledger.online/api/account/username?value=${encodeURIComponent(value)}`
		),
		locals: userId ? { user: { id: userId } } : {}
	} as any;
}

function userDoc(overrides: Record<string, unknown> = {}) {
	return {
		id: 'user-1',
		username: '@ada_0003',
		updatedAt: '',
		save: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('POST /api/account/username', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const { POST } = await import('./+server');
		const response = await POST(postEvent({ username: '@ada' }, null));

		expect(response.status).toBe(401);
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('normalizes before validating, so case and stray @ do not create twins', async () => {
		const user = userDoc();
		mocks.findOne.mockResolvedValueOnce(user).mockReturnValueOnce(leanOne(null));
		const { POST } = await import('./+server');

		const response = await POST(postEvent({ username: '  @@Ada.Lovelace  ' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.username).toBe('@ada.lovelace');
		expect(user.username).toBe('@ada.lovelace');
		expect(user.save).toHaveBeenCalled();
	});

	it('rejects a malformed username before any lookup', async () => {
		const { POST } = await import('./+server');

		const response = await POST(postEvent({ username: '@ada lovelace!' }));

		expect(response.status).toBe(400);
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('rejects one that is too short', async () => {
		const { POST } = await import('./+server');
		const response = await POST(postEvent({ username: '@ab' }));

		expect(response.status).toBe(400);
	});

	it('refuses a name another account holds', async () => {
		const user = userDoc();
		mocks.findOne
			.mockResolvedValueOnce(user)
			.mockReturnValueOnce(leanOne({ id: 'someone-else' }));
		const { POST } = await import('./+server');

		const response = await POST(postEvent({ username: '@grace' }));

		expect(response.status).toBe(409);
		expect(user.save).not.toHaveBeenCalled();
	});

	it('does not treat the caller as a conflict with themselves', async () => {
		const user = userDoc({ username: '@ada' });
		mocks.findOne.mockResolvedValueOnce(user);
		const { POST } = await import('./+server');

		const response = await POST(postEvent({ username: '@ada' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.changed).toBe(false);
	});

	it('reports a concurrent collision as a conflict, not a crash', async () => {
		// Availability and save are two steps: two requests can both read "free".
		// The unique index decides, and the loser must not surface as a 500.
		const duplicate = Object.assign(new Error('E11000 duplicate key username'), {
			code: 11000,
			keyPattern: { username: 1 }
		});
		const user = userDoc({ save: vi.fn().mockRejectedValue(duplicate) });
		mocks.findOne.mockResolvedValueOnce(user).mockReturnValueOnce(leanOne(null));
		const { POST } = await import('./+server');

		const response = await POST(postEvent({ username: '@grace' }));

		expect(response.status).toBe(409);
	});
});

describe('GET /api/account/username', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('reports a free username as available', async () => {
		mocks.findOne.mockReturnValue(leanOne(null));
		const { GET } = await import('./+server');

		const response = await GET(getEvent('@grace'));
		const body = await response.json();

		expect(body).toEqual({ username: '@grace', available: true });
	});

	it('reports a taken username as unavailable, revealing nothing about its owner', async () => {
		mocks.findOne.mockReturnValue(leanOne({ id: 'someone-else', email: 'secret@example.com' }));
		const { GET } = await import('./+server');

		const response = await GET(getEvent('@grace'));
		const body = await response.json();

		expect(body.available).toBe(false);
		expect(JSON.stringify(body)).not.toContain('secret@example.com');
		expect(JSON.stringify(body)).not.toContain('someone-else');
	});

	it('reports the caller own current username as available', async () => {
		mocks.findOne.mockReturnValue(leanOne({ id: 'user-1' }));
		const { GET } = await import('./+server');

		const response = await GET(getEvent('@ada'));

		expect((await response.json()).available).toBe(true);
	});

	it('explains a malformed value instead of querying', async () => {
		const { GET } = await import('./+server');

		const response = await GET(getEvent('not valid!'));
		const body = await response.json();

		expect(body.available).toBe(false);
		expect(typeof body.reason).toBe('string');
		expect(mocks.findOne).not.toHaveBeenCalled();
	});
});
