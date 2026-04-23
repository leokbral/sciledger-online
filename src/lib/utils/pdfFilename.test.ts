import { describe, expect, it } from 'vitest';
import { buildStandardPdfFilename, getPaperSequenceNumber } from './pdfFilename';

describe('buildStandardPdfFilename', () => {
	it('creates a compact standardized filename', () => {
		expect(
			buildStandardPdfFilename({
				authorLastName: 'Góto',
				journalTitle: 'Fungal Insights',
				sequenceNumber: 1,
				year: 2026
			})
			).toBe('GOTO_fungalinsights_2026.pdf');
	});
});

describe('getPaperSequenceNumber', () => {
	it('calculates the yearly sequence using creation order', () => {
		expect(
			getPaperSequenceNumber(
				[
					{ id: 'paper-2025', createdAt: '2025-12-31T12:00:00.000Z' },
					{ id: 'paper-001', createdAt: '2026-01-10T12:00:00.000Z' },
					{ id: 'paper-003', createdAt: '2026-03-10T12:00:00.000Z' }
				],
				{ id: 'paper-002', createdAt: '2026-02-10T12:00:00.000Z' },
				2026
			)
		).toBe(2);
	});
});
