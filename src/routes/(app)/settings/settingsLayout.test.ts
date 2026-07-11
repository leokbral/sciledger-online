import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	hasReviewerCapability: vi.fn()
}));

vi.mock('$lib/server/authorization/reviewerCapability', () => ({
	hasReviewerCapability: mocks.hasReviewerCapability
}));

function createEvent(user: unknown) {
	return { locals: { user } } as any;
}

describe('settings +layout.server.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects unauthenticated requests to /login, same as before the refactor', async () => {
		const { load } = await import('./+layout.server');

		await expect(load(createEvent(undefined))).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});
		expect(mocks.hasReviewerCapability).not.toHaveBeenCalled();
	});

	it('returns the narrowed user shape and isReviewer for authenticated requests', async () => {
		mocks.hasReviewerCapability.mockResolvedValue(true);
		const user = {
			id: 'user-1',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
			username: '@ada',
			roles: { author: true },
			bio: 'should not leak into settings data'
		};
		const { load } = await import('./+layout.server');

		const result = await load(createEvent(user));

		expect(result).toEqual({
			user: {
				id: 'user-1',
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: 'ada@example.com',
				username: '@ada'
			},
			isReviewer: true
		});
		expect(mocks.hasReviewerCapability).toHaveBeenCalledWith(user);
	});
});
