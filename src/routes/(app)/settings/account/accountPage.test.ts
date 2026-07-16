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

function createEvent(userId?: string) {
	return { locals: userId ? { user: { id: userId } } : {} } as any;
}

function mockUserDoc(doc: Record<string, unknown> | null) {
	mocks.findOne.mockReturnValue({
		select: vi.fn().mockReturnValue({
			lean: vi.fn().mockResolvedValue(doc)
		})
	});
}

describe('settings/account +page.server.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('returns a safe fallback when unauthenticated (defensive -- the layout already guards this)', async () => {
		const { load } = await import('./+page.server');

		const result = await load(createEvent());

		expect(result).toEqual({ emailVerified: false, pendingEmail: null });
		expect(mocks.findOne).not.toHaveBeenCalled();
	});

	it('returns emailVerified and pendingEmail for the authenticated user', async () => {
		mockUserDoc({ emailVerified: true, pendingEmail: 'new@example.com' });
		const { load } = await import('./+page.server');

		const result = await load(createEvent('user-1'));

		expect(result).toEqual({ emailVerified: true, pendingEmail: 'new@example.com' });
		expect(mocks.findOne).toHaveBeenCalledWith({ id: 'user-1' });
	});

	it('defaults emailVerified to false and pendingEmail to null when absent on the document', async () => {
		mockUserDoc({});
		const { load } = await import('./+page.server');

		const result = await load(createEvent('user-1'));

		expect(result).toEqual({ emailVerified: false, pendingEmail: null });
	});

	it('never selects or exposes internal token/expiry fields', async () => {
		const selectSpy = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({}) });
		mocks.findOne.mockReturnValue({ select: selectSpy });
		const { load } = await import('./+page.server');

		await load(createEvent('user-1'));

		expect(selectSpy).toHaveBeenCalledWith('emailVerified pendingEmail');
		const projection = selectSpy.mock.calls[0][0] as string;
		expect(projection).not.toMatch(/token/i);
		expect(projection).not.toMatch(/expiresAt/i);
		expect(projection).not.toMatch(/lastSentAt/i);
	});
});
