import { describe, expect, it } from 'vitest';
import {
	REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
	validateReviewerCanReviewPaper
} from './reviewConflictOfInterest';

describe('review conflict of interest validation', () => {
	const paper = {
		id: 'paper-1',
		mainAuthor: 'author-1',
		correspondingAuthor: 'corresponding-1',
		coAuthors: [{ id: 'coauthor-1' }],
		authors: ['author-list-1'],
		submittedBy: 'submitter-1'
	};

	it('blocks an author from reviewing their own paper', () => {
		const result = validateReviewerCanReviewPaper(paper, { id: 'author-1' });

		expect(result).toEqual({
			allowed: false,
			error: REVIEW_CONFLICT_OF_INTEREST_MESSAGE
		});
	});

	it.each(['HubOwner', 'EditorChief', 'AssociateEditor', 'Reviewer'])(
		'blocks an author with %s role from reviewing their own paper',
		(role) => {
			const result = validateReviewerCanReviewPaper(paper, {
				id: 'author-1',
				primaryRoleKey: role,
				roles: {
					editor: role !== 'Reviewer',
					reviewer: true
				}
			});

			expect(result).toEqual({
				allowed: false,
				error: REVIEW_CONFLICT_OF_INTEREST_MESSAGE
			});
		}
	);

	it('blocks a coauthor from reviewing the paper', () => {
		const result = validateReviewerCanReviewPaper(paper, { _id: 'coauthor-1' });

		expect(result).toEqual({
			allowed: false,
			error: REVIEW_CONFLICT_OF_INTEREST_MESSAGE
		});
	});

	it('allows an external reviewer to review the paper', () => {
		const result = validateReviewerCanReviewPaper(paper, { id: 'reviewer-1' });

		expect(result).toEqual({
			allowed: true,
			error: null
		});
	});
});
