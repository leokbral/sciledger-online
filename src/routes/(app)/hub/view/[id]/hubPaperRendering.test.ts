import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import HubPage from './+page.svelte';

// Keep the real page, persona resolution, workspaces and manuscript list together.
// Closed dialogs and reviewer management are unrelated to the paper visibility regression.
vi.mock('@skeletonlabs/skeleton-svelte', () => ({
	Modal: () => {},
	Avatar: () => {},
	createToaster: () => ({})
}));
vi.mock('$lib/components/ReviewerManagement/ReviewerManagement.svelte', () => ({
	default: () => {}
}));
vi.mock('$lib/components/ReviewerManagement/ManageReviewerDeadline.svelte', () => ({
	default: () => {}
}));
vi.mock('$lib/components/Roles/RoleBadge.svelte', () => ({ default: () => {} }));

const hubId = '9b11ff85-53ea-42bb-a1f1-86de1b46db68';
const userId = 'platform-admin';

function paper(id: string, status: string, extra: Record<string, unknown> = {}) {
	return {
		id,
		hubId,
		title: `Manuscript ${id}`,
		status,
		createdAt: '2026-10-19T12:00:00.000Z',
		mainAuthor: { id: 'other-author', username: 'other', firstName: 'Other', lastName: 'Author' },
		coAuthors: [],
		reviewers: [],
		...extra
	};
}

function page(papers: ReturnType<typeof paper>[], overrides: Record<string, unknown> = {}) {
	return render(HubPage, {
		props: {
			data: {
				hub: { _id: hubId, id: hubId, title: 'FUNGAL INSIGHTS', type: 'journal' },
				user: { id: userId, firstName: 'Leonardo' },
				users: [],
				papers,
				notifications: [],
				canManageRbac: false,
				isSuperAdmin: overrides.isPlatformAdmin !== false,
				isPlatformAdmin: true,
				isCreator: false,
				isViceManager: false,
				isHubManager: false,
				isHubReviewer: false,
				canManageRoles: false,
				currentUserHubMember: null,
				effectiveHubMembers: [],
				effectiveReviewers: [],
				memberRoleAssignments: [],
				memberRoleDefinitions: [],
				reviewAssignments: [],
				pendingPaperInvitations: [],
				hubInvitations: [],
				paperReviewInvitations: [],
				...overrides
			}
		}
	}).body;
}

describe('rendering papers through the complete Hub page', () => {
	it.each([
		'draft',
		'reviewer assignment',
		'in review',
		'needing corrections',
		'under correction',
		'awaiting final decision',
		'published',
		'rejected'
	])('shows an unrelated super admin the %s paper counted in the Hub header', (status) => {
		const html = page([paper('hub-paper', status)]);
		expect(html).toContain('Platform Admin (read-only)');
		expect(html).toContain('Manuscript hub-paper');
		expect(html).toContain('/review/inreview/hub-paper?preview=1');
		expect(html).not.toContain('No manuscripts submitted yet.');
	});

	it('shows a Hub-declined paper without requiring the super admin to join the Hub', () => {
		expect(page([paper('declined', 'in review', { rejectedByHub: true })])).toContain(
			'Manuscript declined'
		);
	});

	it('still limits a Reader to published papers', () => {
		const html = page([paper('private', 'in review'), paper('public', 'published')], {
			isPlatformAdmin: false
		});
		expect(html).toContain('Manuscript public');
		expect(html).not.toContain('Manuscript private');
		expect(html).not.toContain('View as reviewer');
	});

	it('retains reviewer assignment filtering', () => {
		const html = page(
			[
				paper('assigned', 'in review', { reviewers: [{ id: userId }] }),
				paper('unassigned', 'in review')
			],
			{
				isPlatformAdmin: false,
				currentUserHubMember: { primaryRoleKey: 'Reviewer', canReview: true }
			}
		);
		expect(html).toContain('Manuscript assigned');
		expect(html).not.toContain('Manuscript unassigned');
	});

	it('resolves authors stored as string references', () => {
		const html = page(
			[paper('authored', 'in review', { submittedBy: userId }), paper('other', 'in review')],
			{ isPlatformAdmin: false }
		);
		expect(html).toContain('Manuscript authored');
		expect(html).not.toContain('Manuscript other');
	});
});
