type SequencePaper = {
	id?: unknown;
	_id?: unknown;
	createdAt?: unknown;
};

function parseDate(value: unknown): Date | null {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}

	if (typeof value === 'string' || typeof value === 'number') {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed;
		}
	}

	return null;
}

function compactSegment(
	value: string,
	fallback: string,
	transform: 'upper' | 'lower'
): string {
	const normalized = value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '');

	if (!normalized) {
		return fallback;
	}

	return transform === 'upper' ? normalized.toUpperCase() : normalized.toLowerCase();
}

function getPaperIdentity(paper: SequencePaper): string {
	const candidate = paper.id ?? paper._id;
	return candidate ? String(candidate) : '';
}

function getSortableTimestamp(createdAt: unknown, fallbackYear: number): number {
	const parsed = parseDate(createdAt);
	if (parsed) {
		return parsed.getTime();
	}

	return new Date(`${fallbackYear}-01-01T00:00:00.000Z`).getTime();
}

export function getPaperYear(createdAt: unknown, fallbackYear = new Date().getFullYear()): number {
	const parsed = parseDate(createdAt);
	return parsed ? parsed.getFullYear() : fallbackYear;
}

export function getPaperSequenceNumber(
	papers: SequencePaper[],
	currentPaper: SequencePaper,
	targetYear = getPaperYear(currentPaper.createdAt)
): number {
	const currentId = getPaperIdentity(currentPaper);
	const sameYearPapers = papers.filter(
		(paper) => getPaperYear(paper.createdAt, targetYear) === targetYear
	);

	if (currentId && !sameYearPapers.some((paper) => getPaperIdentity(paper) === currentId)) {
		sameYearPapers.push(currentPaper);
	}

	if (sameYearPapers.length === 0) {
		return 1;
	}

	sameYearPapers.sort((left, right) => {
		const timeDelta =
			getSortableTimestamp(left.createdAt, targetYear) -
			getSortableTimestamp(right.createdAt, targetYear);

		if (timeDelta !== 0) {
			return timeDelta;
		}

		return getPaperIdentity(left).localeCompare(getPaperIdentity(right));
	});

	if (!currentId) {
		return 1;
	}

	const index = sameYearPapers.findIndex((paper) => getPaperIdentity(paper) === currentId);
	return index >= 0 ? index + 1 : 1;
}

export function buildStandardPdfFilename({
	authorLastName,
	journalTitle,
	sequenceNumber,
	year
}: {
	authorLastName?: string | null;
	journalTitle?: string | null;
	sequenceNumber?: number | null;
	year?: number | null;
}): string {
	void sequenceNumber;
	const safeYear = String(Math.abs(year ?? new Date().getFullYear()));
	const authorSegment = compactSegment(authorLastName ?? '', 'AUTHOR', 'upper');
	const journalSegment = compactSegment(journalTitle ?? '', 'sciledger', 'lower');

	return `${authorSegment}_${journalSegment}_${safeYear}.pdf`;
}
