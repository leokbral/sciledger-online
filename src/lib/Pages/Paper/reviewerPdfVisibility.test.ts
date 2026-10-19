import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import PaperReviewPage from './PaperReviewPage.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/review/inreview/p1') } }));
vi.mock('$lib/components/review/ReviewChat.svelte', () => ({ default: () => {} }));
vi.mock('../Review/ReviewForms.svelte', () => ({
	default: (payload: any) => {
		payload.out += 'REVIEW_FORM';
	}
}));
vi.mock('$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte', () => ({
	default: () => {}
}));
vi.mock('$lib/components/Paper/PublishedPaperView.svelte', () => ({
	default: (payload: any) => {
		payload.out += 'PUBLISHED_VIEW';
	}
}));

const props = {
	paper: { id: 'p1', status: 'published', title: 'Paper', pdfUrl: 'saved-pdf' },
	messageFeed: null,
	canViewSubmittedReviews: true
};

describe('reviewer PDF visibility', () => {
	it('shows the PDF panel to a read-only super admin without a review form', () => {
		const { body } = render(PaperReviewPage, { props: { ...props, reviewerPreview: true } });
		expect(body).toContain('Paper PDF');
		expect(body).toContain('Read-only');
		expect(body).toContain('Refresh PDF preview');
		expect(body).not.toContain('REVIEW_FORM');
		expect(body).not.toContain('PUBLISHED_VIEW');
		// A reviewer preview must render fresh content instead of showing the saved PDF.
		expect(body).not.toContain('/api/pdfs/saved-pdf');
	});

	it('preserves the PDF and review form for an actual reviewer', () => {
		const { body } = render(PaperReviewPage, { props: { ...props, canSubmitReview: true } });
		expect(body).toContain('Paper PDF');
		expect(body).toContain('/api/pdfs/saved-pdf');
		expect(body).toContain('REVIEW_FORM');
	});

	it('preserves the ordinary read-only article view', () => {
		const { body } = render(PaperReviewPage, { props });
		expect(body).not.toContain('Paper PDF');
		expect(body).toContain('PUBLISHED_VIEW');
		expect(body).not.toContain('REVIEW_FORM');
	});
});
