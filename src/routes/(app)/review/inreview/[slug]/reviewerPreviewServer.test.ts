import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	isSuperAdmin: vi.fn(),
	can: vi.fn(),
	findPaper: vi.fn(),
	findQueue: vi.fn(),
	findAssignments: vi.fn(),
	findUsers: vi.fn(),
	findFeed: vi.fn(),
	member: vi.fn(),
	audit: vi.fn()
}));

vi.mock('$lib/db/models/Paper', () => ({ default: { findOne: mocks.findPaper } }));
vi.mock('$lib/db/models/ReviewQueue', () => ({ default: { findOne: mocks.findQueue } }));
vi.mock('$lib/db/models/ReviewAssignment', () => ({ default: { find: mocks.findAssignments } }));
vi.mock('$lib/db/models/User', () => ({ default: { find: mocks.findUsers } }));
vi.mock('$lib/db/models/MessageFeed.js', () => ({ default: { findOne: mocks.findFeed } }));
vi.mock('$lib/server/authorization/superAdmin', () => ({ isSuperAdmin: mocks.isSuperAdmin }));
vi.mock('$lib/server/authorization/authorizationService', () => ({ can: mocks.can }));
vi.mock('$lib/server/authorization/adminAudit', () => ({ recordAdminAuditEvent: mocks.audit }));
vi.mock('$lib/server/authorization/effectiveHubRoles', () => ({
	resolveEffectiveHubRoles: vi.fn().mockResolvedValue({}),
	getEffectiveHubMemberForUser: mocks.member
}));

function query(value: unknown) {
	return {
		populate: vi.fn().mockReturnThis(),
		lean: vi.fn().mockReturnThis(),
		exec: vi.fn().mockResolvedValue(value)
	};
}

function event(preview = true): any {
	return {
		params: { slug: 'paper-1' },
		locals: { user: { id: 'super-1' } },
		url: new URL(`http://localhost/review/inreview/paper-1${preview ? '?preview=1' : ''}`)
	};
}

function setPaper(status: string) {
	mocks.findPaper.mockImplementation((filter) =>
		query(
			!filter.status || filter.status.$in.includes(status)
				? { id: 'paper-1', status, mainAuthor: 'author-1', hubId: { id: 'hub-1' } }
				: null
		)
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.isSuperAdmin.mockResolvedValue(true);
	mocks.can.mockResolvedValue(false);
	mocks.member.mockReturnValue(null);
	mocks.findQueue.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
	mocks.findAssignments.mockReturnValue(query([]));
	mocks.findUsers.mockReturnValue(query([]));
	mocks.findFeed.mockReturnValue(query(null));
});

describe('super admin reviewer preview', () => {
	it.each([
		'draft',
		'reviewer assignment',
		'in review',
		'needing corrections',
		'under correction',
		'awaiting final decision',
		'published',
		'rejected'
	])('opens %s as a reviewer without granting submission', async (status) => {
		setPaper(status);
		const { load } = await import('./+page.server');
		const result = await load(event());
		expect(result.paper).toMatchObject({ status });
		expect(result.reviewerPreview).toBe(true);
		expect(result.canSubmitReview).toBe(false);
		expect(mocks.audit).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'admin.paper.view' })
		);
	});

	it('keeps preview read-only when the super admin is also a hub reviewer', async () => {
		setPaper('in review');
		mocks.member.mockReturnValue({ canReview: true });
		const { load } = await import('./+page.server');
		expect((await load(event())).canSubmitReview).toBe(false);
		expect((await load(event(false))).canSubmitReview).toBe(true);
	});

	it('does not let a regular user bypass workflow stages with the query flag', async () => {
		setPaper('draft');
		mocks.isSuperAdmin.mockResolvedValue(false);
		const { load } = await import('./+page.server');
		await expect(load(event())).rejects.toMatchObject({ status: 404 });
		expect(mocks.audit).not.toHaveBeenCalled();
	});

	it('still rejects an unrelated user for a paper in review', async () => {
		setPaper('in review');
		mocks.isSuperAdmin.mockResolvedValue(false);
		const { load } = await import('./+page.server');
		await expect(load(event())).rejects.toMatchObject({ status: 403 });
	});

	it('shows the PDF to a super admin using the existing review link', async () => {
		setPaper('in review');
		const { load } = await import('./+page.server');
		expect((await load(event(false))).reviewerPreview).toBe(true);
	});
});
