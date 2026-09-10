import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function read(relative: string) {
	return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

const indexSource = read('./+page.svelte');
const submissionSource = read('./submission-withdrawal/+page.svelte');
const publicationSource = read('./publication-withdrawal/+page.svelte');

describe('withdrawal policies are reachable', () => {
	it('is listed on the policies index alongside the existing policies', () => {
		expect(indexSource).toContain('/policies/submission-withdrawal');
		expect(indexSource).toContain('/policies/publication-withdrawal');
		expect(indexSource).toContain('/policies/publishing-ethics');
		expect(indexSource).toContain('/policies/open-access');
	});
});

describe('the two policies are presented as different situations', () => {
	it('has distinct titles', () => {
		expect(submissionSource).toContain('Submission Withdrawal Policy');
		expect(publicationSource).toContain('Publication Withdrawal Policy');
		expect(submissionSource).not.toContain('<h1 class="text-4xl font-bold text-gray-900 mb-4">Publication Withdrawal Policy</h1>');
	});

	it('each policy points at the other so an author lands on the right one', () => {
		expect(submissionSource).toContain('/policies/publication-withdrawal');
		expect(publicationSource).toContain('/policies/submission-withdrawal');
	});
});

describe('submission withdrawal policy uses the real paper states', () => {
	it('names the states the paper.withdraw transition actually accepts', () => {
		for (const state of [
			'draft',
			'reviewer assignment',
			'in review',
			'needing corrections',
			'under correction'
		]) {
			expect(submissionSource).toContain(`<code>${state}</code>`);
		}
	});

	it('handles the states the automated transition does not cover', () => {
		expect(submissionSource).toContain('<code>under final review</code>');
		expect(submissionSource).toContain('<code>awaiting final decision</code>');
	});

	it('distinguishes performed, not performed and partially performed services', () => {
		expect(submissionSource).toContain('Services already performed');
		expect(submissionSource).toContain('Services not yet performed');
		expect(submissionSource).toContain('Partially performed');
	});

	it('treats the three reviewer situations differently', () => {
		expect(submissionSource).toContain('A reviewer who completed a valid review');
		expect(submissionSource).toContain('A reviewer who accepted but did not deliver');
		expect(submissionSource).toContain('A reviewer who was invited but did not review');
		expect(submissionSource).toContain('Accepting an invitation is not a completed review');
	});

	it('keeps the statutory withdrawal right separate from the editorial and payment clocks', () => {
		expect(submissionSource).toContain('Legal right of withdrawal');
		expect(submissionSource).toContain('Statutory right of withdrawal');
		expect(submissionSource).toContain('Review deadline');
		expect(submissionSource).toContain('Card authorization window');
		expect(submissionSource).toContain('Editorial deadlines');
	});
});

describe('publication withdrawal policy starts at acceptance', () => {
	it('applies from accepted and stops at published', () => {
		expect(publicationSource).toContain('<code>accepted</code>');
		expect(publicationSource).toContain('<code>published</code>');
		expect(publicationSource).toContain('This policy stops at publication');
	});

	it('treats the completed editorial work as delivered', () => {
		expect(publicationSource).toContain('Editorial services already delivered');
		expect(publicationSource).toContain('A full refund is not the default outcome');
	});

	it('treats publication itself as the service not carried out', () => {
		expect(publicationSource).toContain('Publication not carried out');
	});

	it('does not turn withdrawal into unpublishing an existing article', () => {
		expect(publicationSource).toContain('correction or retraction');
		expect(publicationSource).not.toMatch(/unpublish/i);
		expect(publicationSource).not.toMatch(/despublica/i);
	});
});

describe('neither policy states an absolute refund rule', () => {
	const sources = { submission: submissionSource, publication: publicationSource };

	for (const [name, source] of Object.entries(sources)) {
		it(`${name}: avoids "never / always refunded" phrasing`, () => {
			expect(source).not.toMatch(/never be refunded|no refund will|always be refunded|always fully refund/i);
		});

		it(`${name}: does not turn a seven-day window into a refund rule`, () => {
			expect(source).not.toMatch(/after\s+(7|seven)\s+days[^.]*no\s+refund/i);
			expect(source).not.toMatch(/(7|seven)[-\s]day\s+refund/i);
		});
	}
});
