import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserLoginHistory } from './loginHistory';

const mocks = vi.hoisted(() => ({ aggregate: vi.fn() }));
vi.mock('$lib/db/models/UserSession', () => ({ default: { aggregate: mocks.aggregate } }));

describe('recorded login history', () => {
	beforeEach(() => mocks.aggregate.mockReset().mockResolvedValue([]));

	it('combines retained sessions for both user identifiers with persisted login dates', async () => {
		const firstLoginAt = new Date('2026-01-01T12:00:00Z');
		const lastLoginAt = new Date('2026-10-02T12:00:00Z');
		mocks.aggregate.mockResolvedValue([
			{ _id: 'internal-id', firstLoginAt, lastLoginAt: firstLoginAt },
			{ _id: 'public-id', firstLoginAt: lastLoginAt, lastLoginAt }
		]);
		const result = await getUserLoginHistory([{
			id: 'public-id', _id: 'internal-id', firstLoginAt: '2026-02-01T12:00:00Z'
		}]);
		expect(result.get('public-id')).toEqual({ firstLoginAt, lastLoginAt });
		expect(mocks.aggregate).toHaveBeenCalledWith([
			{ $match: { userId: { $in: ['public-id', 'internal-id'] } } },
			{ $group: { _id: '$userId', firstLoginAt: { $min: '$createdAt' }, lastLoginAt: { $max: '$createdAt' } } }
		]);
	});

	it('keeps persisted dates when every session has expired or been removed', async () => {
		const firstLoginAt = new Date('2026-01-01T12:00:00Z');
		const lastLoginAt = new Date('2026-06-01T12:00:00Z');
		const result = await getUserLoginHistory([{ id: 'user-1', firstLoginAt, lastLoginAt }]);
		expect(result.get('user-1')).toEqual({ firstLoginAt, lastLoginAt });
	});

	it('uses a previously recorded last login as evidence when it is the only surviving record', async () => {
		const lastLoginAt = new Date('2026-06-01T12:00:00Z');
		const result = await getUserLoginHistory([{ _id: 'user-1', lastLoginAt }]);
		expect(result.get('user-1')).toEqual({ firstLoginAt: lastLoginAt, lastLoginAt });
	});

	it('returns unknown dates for missing or invalid history', async () => {
		const result = await getUserLoginHistory([
			{ id: 'user-1' }, { id: 'user-2', firstLoginAt: 'invalid', lastLoginAt: null }
		]);
		expect([...result.values()]).toEqual([
			{ firstLoginAt: null, lastLoginAt: null }, { firstLoginAt: null, lastLoginAt: null }
		]);
	});

	it('does not query sessions for an empty user page', async () => {
		expect(await getUserLoginHistory([])).toEqual(new Map());
		expect(mocks.aggregate).not.toHaveBeenCalled();
	});
});
