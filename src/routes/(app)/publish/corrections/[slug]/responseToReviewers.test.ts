import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	start_mongo: vi.fn(),
	authorize: vi.fn(),
	findOne: vi.fn(),
	findOneAndUpdate: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({ start_mongo: mocks.start_mongo }));
vi.mock('$lib/db/models/User', () => ({}));
vi.mock('$lib/db/models/MessageFeed', () => ({ default: {} }));
vi.mock('$lib/db/models/Paper', () => ({
	default: { findOne: mocks.findOne, findOneAndUpdate: mocks.findOneAndUpdate }
}));
vi.mock('$lib/server/authorization/authorizationService', () => ({ authorize: mocks.authorize }));
vi.mock('$lib/server/paperLifecycleEvents', () => ({ emitPaperLifecycleEvent: vi.fn() }));

function mockPaper(paper: unknown) {
	mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => paper }) });
}

function mockUpdatedPaper(responseToReviewers: string, version = 1) {
	mocks.findOneAndUpdate.mockReturnValue({
		select: () => ({ lean: () => ({ exec: async () => ({ responseToReviewers, responseToReviewersVersion: version }) }) })
	});
}

async function saveResponse(content: string, user: unknown = { id: 'author-1' }, expectedVersion = 0) {
	const { POST } = await import('./+server');
	return POST({
		params: { slug: 'paper-1' },
		locals: { user },
		request: new Request('http://localhost/publish/corrections/paper-1', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'saveResponseToReviewers', responseToReviewers: content, expectedVersion })
		})
	} as any);
}

async function getResponse(user: unknown = { id: 'author-1' }) {
	const { GET } = await import('./+server');
	return GET({ params: { slug: 'paper-1' }, locals: { user } } as any);
}

describe('Response to Reviewers save', () => {
	beforeEach(() => {
		vi.resetModules();
		Object.values(mocks).forEach((mock) => mock.mockReset());
		mockPaper({ id: 'paper-1', status: 'needing corrections', mainAuthor: 'author-1' });
		mocks.authorize.mockResolvedValue({ allowed: true });
		mockUpdatedPaper('<p>We revised the methods.</p>');
	});

	it('sanitizes HTML and saves only while the paper needs corrections', async () => {
		const response = await saveResponse('<p>We revised the methods.</p><script>alert(1)</script>');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ responseToReviewers: '<p>We revised the methods.</p>', version: 1 });
		expect(mocks.authorize).toHaveBeenCalledWith(
			{ id: 'author-1' },
			'paper.edit',
			{ paper: expect.objectContaining({ id: 'paper-1' }) }
		);
		expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
			{
				id: 'paper-1',
				status: { $in: ['needing corrections', 'under correction'] },
				$or: [{ responseToReviewersVersion: 0 }, { responseToReviewersVersion: { $exists: false } }]
			},
			{
				$set: { responseToReviewers: '<p>We revised the methods.</p>', updatedAt: expect.any(String) },
				$inc: { responseToReviewersVersion: 1 }
			},
			{ new: true }
		);
	});

	it('does not write when the response has not changed', async () => {
		mockPaper({ id: 'paper-1', status: 'needing corrections', responseToReviewers: '<p>Already saved</p>', responseToReviewersVersion: 2 });
		const response = await saveResponse('<p>Already saved</p>', { id: 'author-1' }, 2);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ responseToReviewers: '<p>Already saved</p>', version: 2 });
		expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
	});

	it('returns the latest saved version for another open tab', async () => {
		mockPaper({ id: 'paper-1', status: 'needing corrections', responseToReviewers: '<p>Latest text</p>', responseToReviewersVersion: 4 });
		const response = await getResponse();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ responseToReviewers: '<p>Latest text</p>', version: 4 });
	});

	it('returns the latest response instead of overwriting a newer version', async () => {
		mockPaper({ id: 'paper-1', status: 'needing corrections', responseToReviewers: '<p>Other tab</p>', responseToReviewersVersion: 2 });
		const response = await saveResponse('<p>My old edit</p>', { id: 'author-1' }, 1);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: 'Response to Reviewers changed in another tab.',
			responseToReviewers: '<p>Other tab</p>',
			version: 2
		});
		expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
	});

	it('conditions later saves on the version the author edited', async () => {
		mockPaper({ id: 'paper-1', status: 'needing corrections', responseToReviewers: '<p>Previous</p>', responseToReviewersVersion: 2 });
		mockUpdatedPaper('<p>Updated</p>', 3);
		const response = await saveResponse('<p>Updated</p>', { id: 'author-1' }, 2);
		expect(response.status).toBe(200);
		expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
			{ id: 'paper-1', status: { $in: ['needing corrections', 'under correction'] }, responseToReviewersVersion: 2 },
			{
				$set: { responseToReviewers: '<p>Updated</p>', updatedAt: expect.any(String) },
				$inc: { responseToReviewersVersion: 1 }
			},
			{ new: true }
		);
	});

	it('does not save for a user without edit permission', async () => {
		mocks.authorize.mockResolvedValue({ allowed: false });
		const response = await saveResponse('<p>Response</p>');
		expect(response.status).toBe(403);
		expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
	});

	it('does not save after the paper leaves corrections', async () => {
		mockPaper({ id: 'paper-1', status: 'in review', mainAuthor: 'author-1' });
		const response = await saveResponse('<p>Response</p>');
		expect(response.status).toBe(409);
		expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
	});
});
