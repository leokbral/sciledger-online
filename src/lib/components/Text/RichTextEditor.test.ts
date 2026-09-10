import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const richTextEditor = readFileSync(resolve(here, 'RichTextEditor.svelte'), 'utf8');
const allowedTags = richTextEditor.match(/allowedTags:\s*\[([\s\S]*?)\]/)?.[1] || '';

describe('RichTextEditor sanitization guardrails', () => {
	it('allows scientific superscript and subscript tags without broadening unsafe HTML', () => {
		expect(allowedTags).toContain("'sup'");
		expect(allowedTags).toContain("'sub'");
		expect(allowedTags).not.toContain("'script'");
		expect(allowedTags).not.toContain("'style'");
		expect(allowedTags).not.toContain("'iframe'");
		expect(allowedTags).not.toContain("'object'");
	});
});

describe('RichTextEditor abstract toolbar', () => {
	const abstractToolbar =
		richTextEditor.match(/\.\.\.\(id === 'abstract' \? \[(.*?)\] : \[\]\)/s)?.[1] || '';

	it('offers subscript and superscript in the abstract toolbar', () => {
		expect(abstractToolbar).toContain("{ script: 'sub' }");
		expect(abstractToolbar).toContain("{ script: 'super' }");
	});

	it('keeps the sanitizer able to round-trip what those buttons produce', () => {
		// Quill's `script` format emits <sub>/<sup>; if either were dropped from
		// allowedTags the buttons would silently lose the formatting on save.
		expect(allowedTags).toContain("'sup'");
		expect(allowedTags).toContain("'sub'");
	});

	it('leaves the title toolbar as it was', () => {
		const titleToolbar =
			richTextEditor.match(/id === 'title'\s*\n?\s*\?\s*\[(.*?)\]\s*\n\s*:/s)?.[1] || '';
		expect(titleToolbar).toContain("'bold', 'italic', 'underline'");
		expect(titleToolbar).not.toContain('script');
	});
});
