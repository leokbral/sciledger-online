import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const guideSource = readFileSync(
	fileURLToPath(new URL('./PaperSubmissionGuide.svelte', import.meta.url)),
	'utf8'
);

const helpPageSource = readFileSync(
	fileURLToPath(new URL('../../../routes/(app)/help/how-to-submit/+page.svelte', import.meta.url)),
	'utf8'
);

describe('paper submission guide - official template', () => {
	it('links the official template that the platform already ships', () => {
		expect(guideSource).toContain('href="/paper-template.docx"');
		expect(guideSource).toContain('download="SciLedger_Paper_Template.docx"');
	});

	it('offers the template as a visible download, not only as prose', () => {
		expect(guideSource).toContain('Download template (.docx)');
		expect(guideSource).toContain('Paper Template');
	});

	it('does not invent a second template location', () => {
		const hrefs = guideSource.match(/href="[^"]*template[^"]*"/gi) ?? [];
		expect(hrefs.length).toBeGreaterThan(0);
		for (const href of hrefs) {
			expect(href).toBe('href="/paper-template.docx"');
		}
	});
});

describe('paper submission guide - reference style', () => {
	it('states IEEE as the reference style', () => {
		expect(guideSource).toContain('Reference style: IEEE');
		expect(guideSource).toContain('Institute of Electrical and Electronics Engineers');
	});

	it('shows reference examples in IEEE form', () => {
		expect(guideSource).toContain('IEEE examples:');
		expect(guideSource).toContain('vol. 12, no. 3, pp. 45-58, 2023');
	});

	it('does not offer a competing citation style', () => {
		expect(guideSource).not.toMatch(/\bAPA\b/);
		expect(guideSource).not.toMatch(/\bABNT\b/);
		expect(guideSource).not.toMatch(/\bVancouver\b/i);
		expect(guideSource).not.toMatch(/\bChicago\b/i);
	});

	it('keeps the existing [n] in-text citation rule untouched', () => {
		expect(guideSource).toContain('Citations [n] must correspond to the reference number');
		expect(guideSource).toContain('Use only numeric citations inside brackets:');
	});
});

describe('how-to-submit page', () => {
	it('renders the guide and points to both withdrawal policies', () => {
		expect(helpPageSource).toContain('<PaperSubmissionGuide expanded={true} />');
		expect(helpPageSource).toContain('/policies/submission-withdrawal');
		expect(helpPageSource).toContain('/policies/publication-withdrawal');
	});
});
