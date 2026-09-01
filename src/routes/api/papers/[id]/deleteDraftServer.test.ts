import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	start_mongo: vi.fn(),
	authorize: vi.fn(),
	Papers: {
		findOne: vi.fn(),
		deleteOne: vi.fn()
	},
	Users: {
		updateMany: vi.fn()
	}
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.start_mongo
}));

vi.mock('$lib/db/models/Paper', () => ({
	default: mocks.Papers
}));

vi.mock('$lib/db/models/User', () => ({
	default: mocks.Users
}));

vi.mock('$lib/server/authorization/authorizationService', () => ({
	authorize: mocks.authorize
}));

function mockPaperLookup(paper: unknown) {
	mocks.Papers.findOne.mockReturnValue({
		lean: () => ({
			exec: async () => paper
		})
	});
}

function mockDeleteResult(deletedCount: number) {
	mocks.Papers.deleteOne.mockReturnValue({
		exec: async () => ({ deletedCount })
	});
}

function mockUserUpdate() {
	mocks.Users.updateMany.mockReturnValue({
		exec: async () => ({ modifiedCount: 1 })
	});
}

async function callDelete(user: unknown = { id: 'user-1' }, id = 'paper-1') {
	const { DELETE } = await import('./+server');
	return DELETE({
		params: { id },
		locals: { user }
	} as any);
}

describe('DELETE /api/papers/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		mocks.start_mongo.mockReset();
		mocks.authorize.mockReset();
		mocks.Papers.findOne.mockReset();
		mocks.Papers.deleteOne.mockReset();
		mocks.Users.updateMany.mockReset();
		mockDeleteResult(1);
		mockUserUpdate();
	});

	it('deletes an owned draft and removes stale user paper references', async () => {
		const paper = {
			_id: 'paper-1',
			id: 'paper-1',
			status: 'draft',
			submittedBy: 'user-1'
		};
		mockPaperLookup(paper);
		mocks.authorize.mockResolvedValue({ allowed: true });

		const response = await callDelete();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ success: true, deletedPaperId: 'paper-1' });
		expect(mocks.Papers.findOne).toHaveBeenCalledWith({
			$or: [{ id: 'paper-1' }, { _id: 'paper-1' }]
		});
		expect(mocks.authorize).toHaveBeenCalledWith({ id: 'user-1' }, 'paper.edit', { paper });
		expect(mocks.Papers.deleteOne).toHaveBeenCalledWith({
			_id: 'paper-1',
			status: 'draft'
		});
		expect(mocks.Users.updateMany).toHaveBeenCalledWith(
			{ papers: { $in: ['paper-1'] } },
			{ $pull: { papers: { $in: ['paper-1'] } } }
		);
	});

	it('rejects deletion when the paper is no longer a draft', async () => {
		mockPaperLookup({
			_id: 'paper-1',
			id: 'paper-1',
			status: 'in review',
			submittedBy: 'user-1'
		});
		mocks.authorize.mockResolvedValue({ allowed: true });

		const response = await callDelete();
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body.error).toBe('Only drafts can be deleted.');
		expect(mocks.Papers.deleteOne).not.toHaveBeenCalled();
		expect(mocks.Users.updateMany).not.toHaveBeenCalled();
	});

	it('rejects deletion when the user cannot edit the paper', async () => {
		mockPaperLookup({
			_id: 'paper-1',
			id: 'paper-1',
			status: 'draft',
			submittedBy: 'other-user'
		});
		mocks.authorize.mockResolvedValue({ allowed: false, reason: 'author_scope_required' });

		const response = await callDelete();
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body.reason).toBe('author_scope_required');
		expect(mocks.Papers.deleteOne).not.toHaveBeenCalled();
	});

	it('requires authentication', async () => {
		const response = await callDelete(null);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBe('User not authenticated');
		expect(mocks.Papers.findOne).not.toHaveBeenCalled();
	});
});
