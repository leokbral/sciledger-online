import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	buildSearchFilter,
	escapeRegExp,
	paginate,
	readPagination
} from './pagination';

function params(query: string) {
	return new URLSearchParams(query);
}

describe('readPagination', () => {
	it('defaults to the first page and the default page size', () => {
		expect(readPagination(params(''))).toEqual({
			page: 1,
			pageSize: DEFAULT_PAGE_SIZE,
			skip: 0,
			search: ''
		});
	});

	it('computes skip from page and page size', () => {
		expect(readPagination(params('page=3&pageSize=10'))).toEqual({
			page: 3,
			pageSize: 10,
			skip: 20,
			search: ''
		});
	});

	it('caps page size so a crafted request cannot pull a whole collection', () => {
		const result = readPagination(params('pageSize=100000'));

		expect(result.pageSize).toBe(MAX_PAGE_SIZE);
	});

	it('falls back to defaults for junk, zero and negative values', () => {
		expect(readPagination(params('page=0&pageSize=-5')).page).toBe(1);
		expect(readPagination(params('page=0&pageSize=-5')).pageSize).toBe(DEFAULT_PAGE_SIZE);
		expect(readPagination(params('page=abc')).page).toBe(1);
		expect(readPagination(params('pageSize=abc')).pageSize).toBe(DEFAULT_PAGE_SIZE);
	});

	it('trims the search term', () => {
		expect(readPagination(params('q=%20%20ada%20%20')).search).toBe('ada');
	});
});

describe('paginate', () => {
	it('reports the page count for a partial last page', () => {
		const result = paginate([1, 2], 42, { page: 1, pageSize: 25, skip: 0, search: '' });

		expect(result.pageCount).toBe(2);
		expect(result.total).toBe(42);
		expect(result.items).toEqual([1, 2]);
	});

	it('never reports fewer than one page, even with no records', () => {
		const result = paginate([], 0, { page: 1, pageSize: 25, skip: 0, search: '' });

		expect(result.pageCount).toBe(1);
	});
});

describe('buildSearchFilter', () => {
	it('returns null for an empty term so the caller queries unfiltered', () => {
		expect(buildSearchFilter('', ['email'])).toBeNull();
		expect(buildSearchFilter('   ', ['email'])).toBeNull();
	});

	it('builds a case-insensitive $or across the requested fields', () => {
		expect(buildSearchFilter('ada', ['firstName', 'email'])).toEqual({
			$or: [
				{ firstName: { $regex: 'ada', $options: 'i' } },
				{ email: { $regex: 'ada', $options: 'i' } }
			]
		});
	});

	it('escapes regex metacharacters so a search term cannot inject a pattern', () => {
		const filter = buildSearchFilter('.*', ['email']) as any;

		expect(filter.$or[0].email.$regex).toBe('\\.\\*');
	});

	it('escapes every metacharacter a user could type', () => {
		expect(escapeRegExp('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(
			'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o'
		);
	});
});
