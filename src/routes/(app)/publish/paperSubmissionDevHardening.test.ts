import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

function readSource(path: string) {
	return readFileSync(resolve(root, path), 'utf8');
}

describe('paper submission backend hardening guardrails', () => {
	it('validates supplementary total size in create and edit actions', () => {
		const newServer = readSource('routes/(app)/publish/new/+server.ts');
		const editServer = readSource('routes/(app)/publish/edit/[slug]/+server.ts');

		for (const source of [newServer, editServer]) {
			expect(source).toContain('validateSupplementaryFilesTotal');
			expect(source).toContain('supplementary_total_limit_exceeded');
			expect(source).toContain('{ status: 413 }');
		}
	});

	it('normalizes cover images on every paper save endpoint touched by the publish flow', () => {
		const sources = [
			readSource('routes/(app)/publish/new/+server.ts'),
			readSource('routes/(app)/publish/edit/[slug]/+server.ts'),
			readSource('routes/(app)/publish/negotiation/[slug]/+server.ts')
		];

		for (const source of sources) {
			expect(source).toContain('normalizePaperCoverIds');
			expect(source).toContain('paperPictures: normalizePaperCoverIds');
		}
	});

	it('uses configurable/same-origin DTH conversion with main file 413 validation', () => {
		const source = readSource('routes/(app)/api/dth/convert/+server.ts');

		expect(source).toContain('DTH_CONVERT_URL');
		expect(source).toContain('DTH_API_URL');
		expect(source).toContain('requestUrl.origin');
		expect(source).toContain('MAIN_PAPER_FILE_MAX_BYTES');
		expect(source).toContain('convertDocxToHtmlWithLocalImages');
		expect(source).toContain('rewriteHtmlImageSources');
		expect(source).toContain('imageProcessingWarning');
		expect(source).toContain('return new Response(');
		expect(source).toContain('status: 413');
		expect(source).toContain('status: 502');
		expect(source).toContain('status: 503');
		expect(source).not.toContain("fetch('https://scideep.imd.ufrn.br/dth/api/convert'");
	});
});
