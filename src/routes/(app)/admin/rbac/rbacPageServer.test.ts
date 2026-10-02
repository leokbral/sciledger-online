import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	users: vi.fn(),
	aggregate: vi.fn(),
	authorize: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({ start_mongo: vi.fn() }));
vi.mock('$lib/server/authorization/bootstrapRbac', () => ({ ensureDefaultRoles: vi.fn() }));
vi.mock('$lib/server/authorization/authorizationService', () => ({ authorize: mocks.authorize }));
vi.mock('$lib/services/EventService', () => ({ emitEvent: vi.fn() }));
vi.mock('$lib/db/models/UserSession', () => ({ default: { aggregate: mocks.aggregate } }));
vi.mock('$lib/db/models/User', () => ({ default: { find: mocks.users } }));
vi.mock('$lib/db/models/Role', () => ({
	default: { find: () => ({ sort: () => ({ lean: async () => [] }) }) }
}));
vi.mock('$lib/db/models/UserRoleAssignment', () => ({
	default: { find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) }
}));
vi.mock('$lib/db/models/EditorialAuditLog', () => ({
	default: { find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) }
}));
vi.mock('$lib/db/models/Hub', () => ({
	default: {
		find: () => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) })
	}
}));

import { load } from './+page.server';

function setUsers(users: Record<string, unknown>[]) {
	mocks.users.mockReturnValue({
		select: () => ({ sort: () => ({ limit: () => ({ lean: async () => users }) }) })
	});
}

async function loadFor(user: { id: string } | null) {
	return (await load({ locals: { user } } as Parameters<typeof load>[0])) as any;
}

describe('admin user login dates', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.authorize.mockResolvedValue({ allowed: true });
		mocks.aggregate.mockResolvedValue([]);
		setUsers([]);
	});

	it.each([null, { id: 'ordinary-user' }])('hides login history without permission: %j', async (user) => {
		mocks.authorize.mockResolvedValue({ allowed: false });
		const result = await loadFor(user);
		expect(result.authorized).toBe(false);
		expect(result.users).toEqual([]);
		expect(mocks.users).not.toHaveBeenCalled();
		expect(mocks.aggregate).not.toHaveBeenCalled();
	});

	it('returns persisted dates, historical session logins and null for missing history', async () => {
		const recordedDate = new Date('2026-10-02T12:00:00Z');
		const historicalDate = new Date('2026-09-30T09:00:00Z');
		setUsers([
			{ id: 'recorded', _id: 'recorded', lastLoginAt: recordedDate },
			{ id: 'legacy', _id: 'legacy-db-id' },
			{ id: 'unknown', _id: 'unknown' }
		]);
		mocks.aggregate.mockResolvedValue([{ _id: 'legacy-db-id', lastLoginAt: historicalDate }]);

		const result = await loadFor({ id: 'admin' });

		expect(result.users.map((user: any) => user.lastLoginAt)).toEqual([
			recordedDate.toISOString(), historicalDate.toISOString(), null
		]);
		expect(mocks.aggregate).toHaveBeenCalledWith([
			{ $match: { userId: { $in: ['legacy', 'legacy-db-id', 'unknown', 'unknown'] } } },
			{ $group: { _id: '$userId', lastLoginAt: { $max: '$createdAt' } } }
		]);
	});

	it('retains the last login even when no sessions remain', async () => {
		setUsers([{ id: 'user-1', lastLoginAt: new Date('2026-07-01T12:00:00Z') }]);
		const result = await loadFor({ id: 'admin' });
		expect(result.users[0].lastLoginAt).toBe('2026-07-01T12:00:00.000Z');
		expect(mocks.aggregate).not.toHaveBeenCalled();
	});
});
