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
