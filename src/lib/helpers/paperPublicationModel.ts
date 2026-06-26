type PaperPublicationReference = {
	hub?: unknown;
	hubId?: unknown;
	isLinkedToHub?: boolean;
};

function hasReference(value: unknown): boolean {
	if (!value) return false;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		return Boolean(normalized && normalized !== 'null' && normalized !== 'undefined');
	}
	if (typeof value === 'number') return true;
	if (value instanceof Date) return false;
	if (typeof value !== 'object') return false;

	const candidate = value as { id?: unknown; _id?: unknown; toString?: () => string };
	if (hasReference(candidate.id) || hasReference(candidate._id)) return true;

	const stringified = candidate.toString?.();
	if (stringified && stringified !== '[object Object]') return hasReference(stringified);

	return Object.keys(candidate).length > 0;
}

export function hasHubPublication(
	paper: PaperPublicationReference | null | undefined
): boolean {
	if (!paper) return false;
	return paper.isLinkedToHub === true || hasReference(paper.hubId) || hasReference(paper.hub);
}
