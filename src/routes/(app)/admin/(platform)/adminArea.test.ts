import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These tests exercise the real guard. `authorize()` is the only thing mocked, so
 * `requireSuperAdmin` -> `isSuperAdmin` -> `authorize` runs for real and the test
 * asserts the HTTP status the area produces.
 */
const mocks = vi.hoisted(() => ({
	authorize: vi.fn(),
	recordAdminAuditEvent: vi.fn().mockResolvedValue(null),
	getDashboardMetrics: vi.fn(),
	listUsers: vi.fn(),
	listHubs: vi.fn(),
	listPapers: vi.fn(),
	listReviews: vi.fn(),
	listInvitations: vi.fn(),
	listActivity: vi.fn(),
	getUserDetail: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/server/authorization/authorizationService', () => ({
	authorize: mocks.authorize,
	can: vi.fn()
}));

vi.mock('$lib/server/authorization/adminAudit', () => ({
	recordAdminAuditEvent: mocks.recordAdminAuditEvent
}));

vi.mock('$lib/server/admin/queries', () => ({
	getDashboardMetrics: mocks.getDashboardMetrics,
	getUserDetail: mocks.getUserDetail,
	listUsers: mocks.listUsers,
	listHubs: mocks.listHubs,
	listPapers: mocks.listPapers,
	listReviews: mocks.listReviews,
	listInvitations: mocks.listInvitations,
	listActivity: mocks.listActivity,
	PAPER_STATUSES: ['draft', 'published', 'rejected'],
	PAPER_STATUS_FILTERS: ['draft', 'published', 'declined'],
	DECLINED_PAPER_FILTER: 'declined',
	REVIEW_ASSIGNMENT_STATUSES: ['pending', 'accepted', 'overdue'],
	INVITATION_STATUSES: ['pending', 'accepted', 'expired']
}));

const SUPER_ADMIN = { id: 'super-user', email: 'cabralleonardoferreira@gmail.com' };
const REGULAR_USER = { id: 'regular-user', email: 'someone@example.com' };

function grantSuperAdmin() {
	mocks.authorize.mockResolvedValue({ allowed: true, permission: 'platform.superAdmin' });
}

function denySuperAdmin() {
	mocks.authorize.mockResolvedValue({
		allowed: false,
		permission: 'platform.superAdmin',
		reason: 'no_role_assignment'
	});
}

function emptyPage() {
	return { items: [], total: 0, page: 1, pageSize: 25, pageCount: 1, search: '' };
}

function event(user: any, query = '') {
	return {
		locals: user ? { user } : {},
		url: new URL(`http://localhost/admin?${query}`),
		params: {}
	} as any;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.recordAdminAuditEvent.mockResolvedValue(null);
	mocks.getDashboardMetrics.mockResolvedValue({
		counts: {
			users: 0,
			hubs: 0,
			papers: 0,
			publishedPapers: 0,
			reviewAssignments: 0,
			submittedReviews: 0,
			pendingInvitations: 0
		},
		recentUsers: [],
		recentPapers: [],
		recentAdminActivity: []
	});
	for (const list of [
		mocks.listUsers,
		mocks.listHubs,
		mocks.listPapers,
		mocks.listReviews,
		mocks.listInvitations,
		mocks.listActivity
	]) {
		list.mockResolvedValue(emptyPage());
	}
});

describe('platform layout guard', () => {
	it('rejects an unauthenticated visitor with 401', async () => {
		const { load } = await import('./+layout.server');

		await expect(load(event(null))).rejects.toMatchObject({ status: 401 });
	});

	it('rejects an authenticated non-super-admin with 403', async () => {
		denySuperAdmin();
		const { load } = await import('./+layout.server');

		await expect(load(event(REGULAR_USER))).rejects.toMatchObject({ status: 403 });
	});

	it('admits a super administrator', async () => {
		grantSuperAdmin();
		const { load } = await import('./+layout.server');

		await expect(load(event(SUPER_ADMIN))).resolves.toEqual({ superAdmin: true });
	});
});

describe('dashboard page', () => {
	it('refuses an unauthenticated request with 401 and loads nothing', async () => {
		const { load } = await import('./+page.server');

		await expect(load(event(null))).rejects.toMatchObject({ status: 401 });
		expect(mocks.getDashboardMetrics).not.toHaveBeenCalled();
	});

	it('refuses a regular user with 403 and loads nothing', async () => {
		denySuperAdmin();
		const { load } = await import('./+page.server');

		await expect(load(event(REGULAR_USER))).rejects.toMatchObject({ status: 403 });
		expect(mocks.getDashboardMetrics).not.toHaveBeenCalled();
	});

	it('returns metrics and records an audit event naming the actor', async () => {
		grantSuperAdmin();
		const { load } = await import('./+page.server');

		// SvelteKit types a load's return as possibly void, so the assertion reads
		// through an explicit any rather than fighting the generated signature.
		const result: any = await load(event(SUPER_ADMIN));

		expect(result.counts.users).toBe(0);
		expect(mocks.recordAdminAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				actor: SUPER_ADMIN,
				action: 'admin.dashboard.view',
				resourceType: 'platform',
				resourceId: 'dashboard'
			})
		);
	});
});

describe('users list page', () => {
	it('blocks a regular user', async () => {
		denySuperAdmin();
		const { load } = await import('./users/+page.server');

		await expect(load(event(REGULAR_USER))).rejects.toMatchObject({ status: 403 });
		expect(mocks.listUsers).not.toHaveBeenCalled();
	});

	it('passes paging and search through to the query layer', async () => {
		grantSuperAdmin();
		const { load } = await import('./users/+page.server');

		await load(event(SUPER_ADMIN, 'page=2&pageSize=10&q=ada'));

		expect(mocks.listUsers).toHaveBeenCalledWith({
			page: 2,
			pageSize: 10,
			skip: 10,
			search: 'ada'
		});
	});

	it('records an admin.user.view audit event', async () => {
		grantSuperAdmin();
		const { load } = await import('./users/+page.server');

		await load(event(SUPER_ADMIN, 'q=ada'));

		expect(mocks.recordAdminAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				actor: SUPER_ADMIN,
				action: 'admin.user.view',
				resourceType: 'user'
			})
		);
	});
});

describe('user detail page', () => {
	it('blocks a regular user before looking the account up', async () => {
		denySuperAdmin();
		const { load } = await import('./users/[id]/+page.server');

		await expect(load({ ...event(REGULAR_USER), params: { id: 'user-1' } })).rejects.toMatchObject({
			status: 403
		});
		expect(mocks.getUserDetail).not.toHaveBeenCalled();
	});

	it('returns 404 for an unknown account and audits the denial', async () => {
		grantSuperAdmin();
		mocks.getUserDetail.mockResolvedValue(null);
		const { load } = await import('./users/[id]/+page.server');

		await expect(load({ ...event(SUPER_ADMIN), params: { id: 'nope' } })).rejects.toMatchObject({
			status: 404
		});
		expect(mocks.recordAdminAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ result: 'denied' })
		);
	});

	it('returns the profile for a super administrator', async () => {
		grantSuperAdmin();
		mocks.getUserDetail.mockResolvedValue({ id: 'user-1', name: 'Ada Lovelace' });
		const { load } = await import('./users/[id]/+page.server');

		const result: any = await load({ ...event(SUPER_ADMIN), params: { id: 'user-1' } });

		expect(result.profile.name).toBe('Ada Lovelace');
	});
});

describe('hubs, papers, reviews, invitations and activity pages', () => {
	const pages = [
		{ name: 'hubs', path: './hubs/+page.server', spy: () => mocks.listHubs },
		{ name: 'papers', path: './papers/+page.server', spy: () => mocks.listPapers },
		{ name: 'reviews', path: './reviews/+page.server', spy: () => mocks.listReviews },
		{ name: 'invitations', path: './invitations/+page.server', spy: () => mocks.listInvitations },
		{ name: 'activity', path: './activity/+page.server', spy: () => mocks.listActivity }
	];

	for (const entry of pages) {
		it(`${entry.name}: refuses an unauthenticated request with 401`, async () => {
			const { load } = await import(/* @vite-ignore */ entry.path);

			await expect(load(event(null))).rejects.toMatchObject({ status: 401 });
			expect(entry.spy()).not.toHaveBeenCalled();
		});

		it(`${entry.name}: refuses a regular user with 403`, async () => {
			denySuperAdmin();
			const { load } = await import(/* @vite-ignore */ entry.path);

			await expect(load(event(REGULAR_USER))).rejects.toMatchObject({ status: 403 });
			expect(entry.spy()).not.toHaveBeenCalled();
		});

		it(`${entry.name}: loads for a super administrator`, async () => {
			grantSuperAdmin();
			const { load } = await import(/* @vite-ignore */ entry.path);

			await load(event(SUPER_ADMIN));

			expect(entry.spy()).toHaveBeenCalled();
		});
	}
});

describe('status filters', () => {
	it('ignores an unknown paper status instead of passing it to the query', async () => {
		grantSuperAdmin();
		const { load } = await import('./papers/+page.server');

		await load(event(SUPER_ADMIN, 'status=__not_a_status__'));

		expect(mocks.listPapers).toHaveBeenCalledWith(expect.anything(), {
			status: undefined,
			hubId: undefined
		});
	});

	it('accepts a known paper status', async () => {
		grantSuperAdmin();
		const { load } = await import('./papers/+page.server');

		await load(event(SUPER_ADMIN, 'status=published'));

		expect(mocks.listPapers).toHaveBeenCalledWith(expect.anything(), {
			status: 'published',
			hubId: undefined
		});
	});

	it('accepts the synthetic declined filter', async () => {
		grantSuperAdmin();
		const { load } = await import('./papers/+page.server');

		await load(event(SUPER_ADMIN, 'status=declined'));

		expect(mocks.listPapers).toHaveBeenCalledWith(expect.anything(), {
			status: 'declined',
			hubId: undefined
		});
	});

	/**
	 * `rejected` is the stored value but never the filter the UI offers, because the
	 * declined filter is strictly broader. Accepting it here would reintroduce the
	 * status-only query that hid hub-declined papers.
	 */
	it('does not accept the raw rejected status as a filter', async () => {
		grantSuperAdmin();
		const { load } = await import('./papers/+page.server');

		await load(event(SUPER_ADMIN, 'status=rejected'));

		expect(mocks.listPapers).toHaveBeenCalledWith(expect.anything(), {
			status: undefined,
			hubId: undefined
		});
	});

	it('ignores an unknown review status', async () => {
		grantSuperAdmin();
		const { load } = await import('./reviews/+page.server');

		await load(event(SUPER_ADMIN, 'status=__nope__'));

		expect(mocks.listReviews).toHaveBeenCalledWith(expect.anything(), { status: undefined });
	});

	it('ignores an unknown invitation status', async () => {
		grantSuperAdmin();
		const { load } = await import('./invitations/+page.server');

		await load(event(SUPER_ADMIN, 'status=__nope__'));

		expect(mocks.listInvitations).toHaveBeenCalledWith(expect.anything(), { status: undefined });
	});
});
