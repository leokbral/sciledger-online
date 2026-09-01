import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const paperPublishPage = readFileSync(resolve(here, 'PaperPublishPage.svelte'), 'utf8');

describe('PaperPublishPage DEV hardening guardrails', () => {
	it('routes DOCX conversion through the same-origin proxy and guards stale processing', () => {
		expect(paperPublishPage).toContain("fetch('/api/dth/convert'");
		expect(paperPublishPage).not.toContain("fetch('https://scideep.imd.ufrn.br/dth/api/convert'");
		expect(paperPublishPage).toContain('activeDocxProcessingToken');
		expect(paperPublishPage).toContain('resetExtractedDocumentMetadata');
		expect(paperPublishPage).toContain('validateMainPaperFileSize');
	});

	it('enforces cumulative supplementary upload size in the pending batch', () => {
		expect(paperPublishPage).toContain('SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES');
		expect(paperPublishPage).toContain('getSupplementaryFilesTotal([...supplementaryFiles, ...pendingSupplementaryFiles])');
		expect(paperPublishPage).toContain('projectedTotalSize');
		expect(paperPublishPage).toContain('validateSupplementaryFilesTotal');
	});

	it('replaces the cover image instead of appending another persisted image', () => {
		expect(paperPublishPage).toContain('normalizePaperCoverIds');
		expect(paperPublishPage).toContain('imageItems = [{ file, previewUrl:');
		expect(paperPublishPage).toContain('coverImageIds = normalizePaperCoverIds([data.id])');
	});

	it('keeps the confirm submission modal scrollable on short viewports', () => {
		expect(paperPublishPage).toContain('overflow-y-auto');
		expect(paperPublishPage).toContain('max-h-[calc(100dvh-4rem)]');
		expect(paperPublishPage).toContain('flex-shrink-0 gap-3 justify-end border-t');
	});

	it('uses English loading states and keeps stale DOCX processing from overwriting newer files', () => {
		expect(paperPublishPage).toContain("'converting'");
		expect(paperPublishPage).toContain("'processing_images'");
		expect(paperPublishPage).toContain("'updating_preview'");
		expect(paperPublishPage).toContain('Uploading document...');
		expect(paperPublishPage).toContain('Converting document...');
		expect(paperPublishPage).toContain('Processing images...');
		expect(paperPublishPage).toContain('Updating preview...');
		expect(paperPublishPage).toContain('Document processed successfully.');
		expect(paperPublishPage).toContain('token !== activeDocxProcessingToken || docxFile !== file');
	});

	it('preserves superscript and subscript while extracting abstract HTML for preview', () => {
		expect(paperPublishPage).toContain("type ScriptPosition = 'normal' | 'sup' | 'sub'");
		expect(paperPublishPage).toContain("tag === 'sup' ? 'sup' : tag === 'sub' ? 'sub'");
		expect(paperPublishPage).toContain('vertical-align\\s*:\\s*(super|text-top)');
		expect(paperPublishPage).toContain('vertical-align\\s*:\\s*(sub|text-bottom)');
		expect(paperPublishPage).toContain("if (seg.script === 'sup') value = `<sup>${value}</sup>`;");
		expect(paperPublishPage).toContain("if (seg.script === 'sub') value = `<sub>${value}</sub>`;");
		expect(paperPublishPage).toContain('return normalizeToInlineHtml(paragraphMatch[1]);');
		expect(paperPublishPage).toContain('return normalizeToInlineHtml(paragraphs[i].html);');
		expect(paperPublishPage).toContain('{@html content}');
	});
});
