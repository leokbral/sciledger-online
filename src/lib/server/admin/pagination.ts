export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type PaginationInput = {
	page: number;
	pageSize: number;
	skip: number;
	search: string;
};

export type Paginated<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	pageCount: number;
	search: string;
};

function toPositiveInteger(value: string | null, fallback: number) {
	const parsed = Number.parseInt(String(value ?? ''), 10);
	if (!Number.isFinite(parsed) || parsed < 1) return fallback;
	return parsed;
}

/**
 * Reads pagination and search parameters from a query string. Page size is capped
 * so that a crafted `pageSize` cannot be used to pull a whole collection into memory.
 */
export function readPagination(searchParams: URLSearchParams): PaginationInput {
	const page = toPositiveInteger(searchParams.get('page'), 1);
	const requestedPageSize = toPositiveInteger(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
	const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
	const search = String(searchParams.get('q') ?? '').trim();

	return { page, pageSize, skip: (page - 1) * pageSize, search };
}

export function paginate<T>(items: T[], total: number, input: PaginationInput): Paginated<T> {
	return {
		items,
		total,
		page: input.page,
		pageSize: input.pageSize,
		pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
		search: input.search
	};
}

/** Escapes a user-supplied search term so it cannot inject regex syntax. */
export function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Builds a case-insensitive "contains" matcher for the given fields. */
export function buildSearchFilter(search: string, fields: string[]) {
	const term = search.trim();
	if (!term || fields.length === 0) return null;

	const regex = { $regex: escapeRegExp(term), $options: 'i' };
	return { $or: fields.map((field) => ({ [field]: regex })) };
}
