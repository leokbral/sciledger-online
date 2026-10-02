import { describe, expect, it } from 'vitest';
import {
	filterPapersForPersona,
	isPaperDeclined,
	isPaperReviewableByUser,
	paperHasReviewerForUser,
	toUserAliases
} from './hubPaperVisibility';
import { resolveHubWorkspaceForHub } from './hubResolver';
import type { HubWorkspacePaper } from './hubTypes';

const ME = 'user-me';
const OTHER = 'user-other';

function paper(id: string, overrides: Partial<HubWorkspacePaper> = {}): HubWorkspacePaper {
	return {
		id,
		status: 'in review',
		mainAuthor: { id: OTHER },
		coAuthors: [],
		reviewers: [],
		peer_review: { assignedReviewers: [], responses: [] },
		...overrides
	};
}

const assignedToMe = paper('assigned', { reviewers: [{ id: ME }] });
const acceptedByMe = paper('accepted', {
	peer_review: { assignedReviewers: [], responses: [{ reviewerId: ME, status: 'accepted' }] }
});
const declinedByHub = paper('declined-by-hub', {
	status: 'reviewer assignment',
	rejectedByHub: true,
	reviewers: [{ id: ME }]
});
const rejectedStatus = paper('rejected', { status: 'rejected', reviewers: [ME] });
const draftAssigned = paper('draft', { status: 'draft', reviewers: [ME] });
const notMine = paper('not-mine');
const mineAsAuthor = paper('mine-author', { mainAuthor: { id: ME } });
const mineAsCoAuthor = paper('mine-coauthor', { coAuthors: [{ _id: ME }] });
const mineDeclined = paper('mine-declined', { submittedBy: ME, rejectedByHub: true });
const published = paper('published', { status: 'published' });

const allPapers = [
	assignedToMe,
	acceptedByMe,
	declinedByHub,
	rejectedStatus,
	draftAssigned,
	notMine,
	mineAsAuthor,
	mineAsCoAuthor,
	mineDeclined,
	published
];

const ids = (papers: HubWorkspacePaper[]) => papers.map((item) => item.id);

describe('isPaperDeclined', () => {
	it('treats rejectedByHub as declined even when the status was not changed', () => {
		expect(isPaperDeclined(declinedByHub)).toBe(true);
		expect(isPaperDeclined(rejectedStatus)).toBe(true);
		expect(isPaperDeclined(assignedToMe)).toBe(false);
	});
});

describe('reviewer assignment', () => {
	const me = toUserAliases(ME);

	it('does not count an assignedReviewers entry the reviewer declined', () => {
		const declinedInvite = paper('declined-invite', {
			peer_review: {
				assignedReviewers: [ME],
				responses: [{ reviewerId: ME, status: 'declined' }]
			}
		});
		expect(paperHasReviewerForUser(declinedInvite, me)).toBe(false);
	});

	it('excludes drafts and Hub-declined papers from the review queue', () => {
		expect(isPaperReviewableByUser(assignedToMe, me)).toBe(true);
		expect(isPaperReviewableByUser(declinedByHub, me)).toBe(false);
		expect(isPaperReviewableByUser(draftAssigned, me)).toBe(false);
	});
});

describe('filterPapersForPersona', () => {
	it('shows a Reviewer only the papers assigned to them, never declined ones', () => {
		expect(ids(filterPapersForPersona(allPapers, 'Reviewer', ME))).toEqual([
			'assigned',
			'accepted'
		]);
	});

	it('shows an Author only papers they authored or co-authored, including declined ones', () => {
		expect(ids(filterPapersForPersona(allPapers, 'Author', ME))).toEqual([
			'mine-author',
			'mine-coauthor',
			'mine-declined'
		]);
	});

	it('shows editorial personas everything the server returned', () => {
		for (const persona of ['HubOwner', 'EditorChief', 'AssociateEditor'] as const) {
			expect(filterPapersForPersona(allPapers, persona, ME)).toHaveLength(allPapers.length);
		}
	});

	it('shows a Reader only published papers', () => {
		expect(ids(filterPapersForPersona(allPapers, 'Reader', ME))).toEqual(['published']);
	});
});

describe('resolveHubWorkspaceForHub', () => {
	it('does not offer the Reviewer workspace for papers that were only declined by the Hub', () => {
		const resolution = resolveHubWorkspaceForHub(null, null, {
			userId: ME,
			papers: [declinedByHub]
		});
		expect(resolution.availablePersonas.map((persona) => persona.key)).not.toContain('Reviewer');
	});

	it('offers both Reviewer and Author workspaces when the user has both kinds of papers', () => {
		const resolution = resolveHubWorkspaceForHub(null, null, {
			userId: ME,
			papers: [assignedToMe, mineAsAuthor]
		});
		expect(resolution.availablePersonas.map((persona) => persona.key)).toEqual([
			'Reviewer',
			'Author'
		]);
	});
});
