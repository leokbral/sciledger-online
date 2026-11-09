import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	findHubs: vi.fn(),
	findHub: vi.fn(),
	findPapers: vi.fn(),
	start: vi.fn()
}));
vi.mock('$lib/db/models/Hub', () => ({
	default: { find: mocks.findHubs, findById: mocks.findHub }
}));
vi.mock('$lib/db/models/Paper', () => ({ default: { find: mocks.findPapers } }));
vi.mock('$lib/db/mongooseConnection', () => ({ start_mongo: mocks.start }));

import { loadPublicHub, publicHub, PUBLIC_HUB_FIELDS } from './publicHubs';

function query(value: unknown) {
	return {
		select: vi.fn().mockReturnThis(),
		populate: vi.fn().mockReturnThis(),
		sort: vi.fn().mockReturnThis(),
		lean: vi.fn().mockReturnThis(),
		exec: vi.fn().mockResolvedValue(value)
	};
}

const hub = {
	_id: 'hub-1',
	id: 'legacy-id',
	title: 'Research Hub',
	type: 'Journal',
	description: '<p>Public research</p><script>alert(1)</script>',
	logoUrl: 'logo-1',
	bannerUrl: 'banner-1',
	cardUrl: 'card-1',
	guidelinesUrl: 'javascript:alert(1)',
	acknowledgement: '<p onclick="alert(1)">Thank you</p>',
	publicationPolicy: { text: '<p>Open science</p>', updatedBy: 'private-user' },
	showCalendar: false,
	calendar: 'Hidden calendar',
	dates: { submissionEnd: new Date('2026-12-01T00:00:00Z') },
	socialMedia: { website: 'https://example.org', twitter: 'javascript:alert(1)' },
	reviewers: ['private-reviewer'],
	assignedReviews: [{ paperId: 'draft' }],
	submittedPapers: ['draft'],
	createdBy: { email: 'private@example.org', password: 'secret' }
};

describe('public Hub data boundary', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('preserves public information and images while removing private fields and unsafe HTML', () => {
		const result = publicHub(hub);
		expect(result).toMatchObject({
			_id: 'hub-1',
			title: 'Research Hub',
			logoUrl: 'logo-1',
			bannerUrl: 'banner-1',
			cardUrl: 'card-1',
			description: '<p>Public research</p>',
			acknowledgement: '<p>Thank you</p>',
			calendar: '',
			guidelinesUrl: '',
			publicationPolicy: '<p>Open science</p>',
			dates: { submissionEnd: '2026-12-01T00:00:00.000Z' }
		});
		expect(result.socialMedia).toEqual([{ name: 'website', url: 'https://example.org/' }]);
		for (const field of ['createdBy', 'reviewers', 'submittedPapers', 'assignedReviews']) {
			expect(result).not.toHaveProperty(field);
			expect(PUBLIC_HUB_FIELDS.split(' ')).not.toContain(field);
		}
	});

	it('loads the directory without requiring a user or querying papers', async () => {
		const hubsQuery = query([hub]);
		mocks.findHubs.mockReturnValue(hubsQuery);
		const { load } = await import('../../routes/(app)/hub/+page.server');
		const result = (await load({ locals: {} } as any)) as any;
		expect(result.hubs).toHaveLength(1);
		expect(hubsQuery.select).toHaveBeenCalledWith(PUBLIC_HUB_FIELDS);
		expect(mocks.findPapers).not.toHaveBeenCalled();
	});

	it('queries only published papers and returns only their public summary', async () => {
		mocks.findHub.mockReturnValue(query(hub));
		const papersQuery = query([
			{ _id: 'paper-1', title: '<em>Published paper</em>', reviewSlots: ['private'] }
		]);
		mocks.findPapers.mockReturnValue(papersQuery);
		const result = await loadPublicHub('hub-1');
		expect(mocks.findPapers).toHaveBeenCalledWith({ hubId: 'hub-1', status: 'published' });
		expect(papersQuery.select).toHaveBeenCalledWith(
			'_id id title abstract keywords createdAt mainAuthor coAuthors'
		);
		expect(papersQuery.populate).toHaveBeenCalledWith(
			'mainAuthor',
			'_id id firstName lastName username'
		);
		expect(result.publishedPapers).toEqual([
			{
				_id: 'paper-1',
				id: 'paper-1',
				title: 'Published paper',
				status: 'published',
				createdAt: null,
				abstract: '',
				keywords: [],
				mainAuthor: null,
				coAuthors: []
			}
		]);
		expect(result.isPublic).toBe(true);
	});

	it('returns 404 for a nonexistent Hub', async () => {
		mocks.findHub.mockReturnValue(query(null));
		await expect(loadPublicHub('missing')).rejects.toMatchObject({ status: 404 });
		expect(mocks.findPapers).not.toHaveBeenCalled();
	});
});
