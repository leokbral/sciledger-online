import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	start_mongo: vi.fn(),
	authorize: vi.fn(),
	findOne: vi.fn(),
	reviewExists: vi.fn(),
	deleteQueue: vi.fn(),
	updateAssignments: vi.fn(),
	updateInvitations: vi.fn(),
	emitEvent: vi.fn(),
	getPaperAuthorAliases: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({ start_mongo: mocks.start_mongo }));
vi.mock('$lib/db/models/Paper', () => ({ default: { findOne: mocks.findOne } }));
vi.mock('$lib/db/models/Review', () => ({ default: { exists: mocks.reviewExists } }));
vi.mock('$lib/db/models/ReviewQueue', () => ({ default: { deleteMany: mocks.deleteQueue } }));
vi.mock('$lib/db/models/ReviewAssignment', () => ({
	default: { updateMany: mocks.updateAssignments }
}));
vi.mock('$lib/db/models/PaperReviewInvitation', () => ({
	default: { updateMany: mocks.updateInvitations }
}));
vi.mock('$lib/server/authorization/authorizationService', () => ({
	authorize: mocks.authorize
}));
vi.mock('$lib/services/EventService', () => ({ emitEvent: mocks.emitEvent }));
vi.mock('$lib/server/reviewConflictOfInterest', () => ({
	getPaperAuthorAliases: mocks.getPaperAuthorAliases
}));

async function callRemove(reviewerId = 'reviewer-1') {
	const { POST } = await import('./+server');
	return POST({
		params: { paperId: 'paper-1' },
		request: new Request('http://localhost/api/papers/paper-1/remove-reviewer', {
			method: 'POST',
			body: JSON.stringify({ reviewerId })
		}),
		locals: { user: { id: 'manager-1' } }
	} as any);
}

describe('POST /api/papers/[paperId]/remove-reviewer', () => {
	beforeEach(() => {
		vi.resetModules();
		for (const mock of Object.values(mocks)) mock.mockReset();
		mocks.authorize.mockResolvedValue({ allowed: true });
		mocks.reviewExists.mockResolvedValue(null);
		mocks.getPaperAuthorAliases.mockReturnValue([]);
	});

	it('removes a reviewer shown through the peer review and slot fields', async () => {
		const paper = {
			_id: 'paper-1',
			id: 'paper-1',
			status: 'in review',
			title: 'Test paper',
			reviewers: [],
			peer_review: {
				assignedReviewers: ['reviewer-1', 'reviewer-2'],
				responses: [
					{ reviewerId: 'reviewer-1', status: 'accepted' },
					{ reviewerId: 'reviewer-2', status: 'accepted' }
				]
			},
			reviewSlots: [
				{ reviewerId: 'reviewer-1', status: 'occupied', acceptedAt: new Date() },
				{ reviewerId: 'reviewer-2', status: 'occupied' }
			],
			availableSlots: 0,
			save: vi.fn()
		};
		mocks.findOne.mockResolvedValue(paper);

		const response = await callRemove();

		expect(response.status).toBe(200);
		expect(mocks.findOne).toHaveBeenCalledWith({
			$or: [{ id: 'paper-1' }, { _id: 'paper-1' }]
		});
		expect(paper.peer_review.assignedReviewers).toEqual(['reviewer-2']);
		expect(paper.peer_review.responses).toEqual([{ reviewerId: 'reviewer-2', status: 'accepted' }]);
		expect(paper.reviewSlots[0]).toMatchObject({ reviewerId: null, status: 'available' });
		expect(paper.availableSlots).toBe(1);
		expect(paper.save).toHaveBeenCalledOnce();
		expect(mocks.deleteQueue).toHaveBeenCalledWith({
			paperId: 'paper-1',
			reviewer: 'reviewer-1'
		});
		expect(mocks.updateAssignments).toHaveBeenCalledOnce();
	});

	it('preserves a reviewer who has already submitted a review', async () => {
		const paper = {
			_id: 'paper-1',
			status: 'in review',
			reviewers: ['reviewer-1'],
			peer_review: { assignedReviewers: ['reviewer-1'], responses: [] },
			reviewSlots: [],
			save: vi.fn()
		};
		mocks.findOne.mockResolvedValue(paper);
		mocks.reviewExists.mockResolvedValue({ _id: 'review-1' });

		const response = await callRemove();

		expect(response.status).toBe(409);
		expect(paper.reviewers).toEqual(['reviewer-1']);
		expect(paper.save).not.toHaveBeenCalled();
		expect(mocks.deleteQueue).not.toHaveBeenCalled();
	});
});
