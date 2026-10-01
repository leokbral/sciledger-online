import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	authorize: vi.fn(),
	recordAdminAuditEvent: vi.fn().mockResolvedValue(null),
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
	REVIEW_ASSIGNMENT_STATUSES: ['pending', 'accepted'],
	INVITATION_STATUSES: ['pending', 'accepted']
}));

const SUPER_ADMIN = { id: 'super-user', email: 'cabralleonardoferreira@gmail.com' };
const REGULAR_USER = { id: 'regular-user' };

function grantSuperAdmin() {
	mocks.authorize.mockResolvedValue({ allowed: true, permission: 'platform.superAdmin' });
}

function denySuperAdmin() {
	mocks.authorize.mockResolvedValue({ allowed: false, permission: 'platform.superAdmin' });
}

function emptyPage() {
	return { items: [], total: 0, page: 1, pageSize: 25, pageCount: 1, search: '' };
}

function event(user: any, query = '', params: Record<string, string> = {}) {
	return {
		locals: user ? { user } : {},
		url: new URL(`http://localhost/api/admin?${query}`),
		params
	} as any;
}

const endpoints = [
	{ name: 'users', path: './users/+server', spy: () => mocks.listUsers },
	{ name: 'hubs', path: './hubs/+server', spy: () => mocks.listHubs },
	{ name: 'papers', path: './papers/+server', spy: () => mocks.listPapers },
	{ name: 'reviews', path: './reviews/+server', spy: () => mocks.listReviews },
	{ name: 'invitations', path: './invitations/+server', spy: () => mocks.listInvitations },
	{ name: 'activity', path: './activity/+server', spy: () => mocks.listActivity }
];

beforeEach(() => {
	vi.clearAllMocks();
	mocks.recordAdminAuditEvent.mockResolvedValue(null);
	for (const endpoint of endpoints) {
		endpoint.spy().mockResolvedValue(emptyPage());
	}
});

describe('administrative API authorization', () => {
	for (const endpoint of endpoints) {
		it(`GET /api/admin/${endpoint.name} rejects an unauthenticated caller with 401`, async () => {
			const { GET } = await import(/* @vite-ignore */ endpoint.path);

			await expect(GET(event(null))).rejects.toMatchObject({ status: 401 });
			expect(endpoint.spy()).not.toHaveBeenCalled();
		});

		it(`GET /api/admin/${endpoint.name} rejects a regular user with 403`, async () => {
			denySuperAdmin();
			const { GET } = await import(/* @vite-ignore */ endpoint.path);

			await expect(GET(event(REGULAR_USER))).rejects.toMatchObject({ status: 403 });
			expect(endpoint.spy()).not.toHaveBeenCalled();
		});

		it(`GET /api/admin/${endpoint.name} serves a super administrator`, async () => {
			grantSuperAdmin();
			const { GET } = await import(/* @vite-ignore */ endpoint.path);

			const response = await GET(event(SUPER_ADMIN));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({ items: [], total: 0, page: 1, pageCount: 1 });
			expect(endpoint.spy()).toHaveBeenCalled();
		});

		it(`GET /api/admin/${endpoint.name} audits the read with the acting administrator`, async () => {
			grantSuperAdmin();
			const { GET } = await import(/* @vite-ignore */ endpoint.path);

			await GET(event(SUPER_ADMIN));

			expect(mocks.recordAdminAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					actor: SUPER_ADMIN,
					metadata: expect.objectContaining({ source: 'api' })
				})
			);
		});
	}

	it('GET /api/admin/users/[id] rejects a regular user before any lookup', async () => {
		denySuperAdmin();
		const { GET } = await import('./users/[id]/+server');

		await expect(GET(event(REGULAR_USER, '', { id: 'user-1' }))).rejects.toMatchObject({
			status: 403
		});
		expect(mocks.getUserDetail).not.toHaveBeenCalled();
	});

	it('GET /api/admin/users/[id] returns 404 for an unknown account', async () => {
		grantSuperAdmin();
		mocks.getUserDetail.mockResolvedValue(null);
		const { GET } = await import('./users/[id]/+server');

		await expect(GET(event(SUPER_ADMIN, '', { id: 'nope' }))).rejects.toMatchObject({
			status: 404
		});
	});

	it('GET /api/admin/users/[id] serves the profile to a super administrator', async () => {
		grantSuperAdmin();
		mocks.getUserDetail.mockResolvedValue({ id: 'user-1', name: 'Ada Lovelace' });
		const { GET } = await import('./users/[id]/+server');

		const response = await GET(event(SUPER_ADMIN, '', { id: 'user-1' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.user.name).toBe('Ada Lovelace');
	});
});

describe('administrative API surface is read-only', () => {
	const adminApiDir = dirname(fileURLToPath(import.meta.url));

	function serverFiles(dir: string): string[] {
		return readdirSync(dir).flatMap((entry) => {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) return serverFiles(full);
			return entry === '+server.ts' ? [full] : [];
		});
	}

	it('finds every administrative endpoint', () => {
		expect(serverFiles(adminApiDir).length).toBeGreaterThanOrEqual(7);
	});

	/**
	 * Nobody may promote themselves over HTTP. An endpoint that exported a mutating
	 * method would be the obvious way for that to creep in, so the surface is
	 * asserted structurally rather than trusted to review.
	 */
	it('exports no mutating HTTP method anywhere under /api/admin', () => {
		for (const file of serverFiles(adminApiDir)) {
			const source = readFileSync(file, 'utf8');

			for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				expect(source).not.toMatch(new RegExp(`export\\s+const\\s+${method}\\b`));
				expect(source).not.toMatch(new RegExp(`export\\s+async\\s+function\\s+${method}\\b`));
			}
		}
	});

	it('guards every administrative endpoint with the super admin check', () => {
		for (const file of serverFiles(adminApiDir)) {
			const source = readFileSync(file, 'utf8');
			const guarded =
				source.includes('requireSuperAdmin') || source.includes('respondWithAdminList');

			expect(guarded, `${file} must go through the super admin guard`).toBe(true);
		}
	});

	it('never writes a role assignment from an administrative endpoint', () => {
		for (const file of serverFiles(adminApiDir)) {
			const source = readFileSync(file, 'utf8');

			expect(source, `${file} must not touch role assignments`).not.toContain('UserRoleAssignment');
			// The role key itself, not the `requireSuperAdmin` guard that contains it
			// as a substring.
			expect(source, `${file} must not name the SuperAdmin role key`).not.toMatch(
				/(['"`])SuperAdmin\1|SUPER_ADMIN_ROLE_KEY/
			);
		}
	});
});
