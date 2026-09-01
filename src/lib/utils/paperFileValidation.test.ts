import { describe, expect, it } from 'vitest';
import {
	MAIN_PAPER_FILE_MAX_BYTES,
	SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES
} from '$lib/constants/paperUploadLimits';
import {
	normalizePaperCoverIds,
	validateMainPaperFileSize,
	validateSupplementaryFilesTotal
} from './paperFileValidation';

describe('paper file validation', () => {
	it('accepts a main DOCX file up to the configured 20 MB limit', () => {
		expect(validateMainPaperFileSize({ size: MAIN_PAPER_FILE_MAX_BYTES }).ok).toBe(true);
		expect(validateMainPaperFileSize({ size: MAIN_PAPER_FILE_MAX_BYTES + 1 })).toMatchObject({
			ok: false,
			code: 'main_file_too_large',
			maxBytes: MAIN_PAPER_FILE_MAX_BYTES
		});
	});

	it('validates supplementary files by cumulative total, not per-file only', () => {
		const mb = 1024 * 1024;

		expect(validateSupplementaryFilesTotal([{ fileSize: 8 * mb }, { fileSize: 6 * mb }])).toMatchObject({
			ok: true,
			totalSize: 14 * mb,
			maxBytes: SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES
		});

		expect(
			validateSupplementaryFilesTotal([{ fileSize: 8 * mb }, { fileSize: 6 * mb }, { fileSize: 6 * mb }])
		).toMatchObject({
			ok: true,
			totalSize: 20 * mb
		});

		expect(
			validateSupplementaryFilesTotal([{ fileSize: 8 * mb }, { fileSize: 6 * mb }, { fileSize: 7 * mb }])
		).toMatchObject({
			ok: false,
			code: 'supplementary_total_limit_exceeded',
			totalSize: 21 * mb
		});
	});

	it('normalizes paper cover images to a single valid image id', () => {
		expect(normalizePaperCoverIds(['cover-a', 'cover-b'])).toEqual(['cover-a']);
		expect(normalizePaperCoverIds(['', null, 'cover-c'])).toEqual(['cover-c']);
		expect(normalizePaperCoverIds(undefined)).toEqual([]);
		expect(normalizePaperCoverIds('cover-d')).toEqual(['cover-d']);
	});
});
