import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'PaperPublishPage.svelte'), 'utf8');

describe('PaperPublishPage converted DOCX title preview styling', () => {
	it('keeps rendering the converted DOCX HTML as the preview source', () => {
		expect(source).toContain('{@html content}');
		expect(source).not.toContain('{@html $store.title}');
	});

	it('gives the first converted block title-level hierarchy without changing extraction', () => {
		expect(source).toContain('paper-preview-content');
		expect(source).toContain('[&>*:first-child]:text-3xl');
		expect(source).toContain('md:[&>*:first-child]:text-4xl');
		expect(source).toContain('[&>*:first-child]:font-bold');
		expect(source).toContain('[&>*:first-child]:leading-tight');
		expect(source).toContain('[&>*:first-child]:mb-7');
		expect(source).toContain('[&>*:first-child]:pb-4');
		expect(source).toContain('[&>*:first-child]:border-b');
	});

	it('protects long and special-character titles from overflowing the preview', () => {
		expect(source).toContain('[&>*:first-child]:break-words');
		expect(source).toContain('[&>*:first-child]:tracking-normal');
	});
});
