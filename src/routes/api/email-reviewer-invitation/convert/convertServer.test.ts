import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findEmailReviewerInvitationByToken: vi.fn(),
	isEmailReviewerInvitationActive: vi.fn(),
	userFindOne: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/server/auth/emailReviewerInvitation', () => ({
	findEmailReviewerInvitationByToken: mocks.findEmailReviewerInvitationByToken,
	isEmailReviewerInvitationActive: mocks.isEmailReviewerInvitationActive
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.userFindOne
	}
}));

function createRequestEvent(body: Record<string, unknown>) {
	return {
		request: {
			json: async () => body
		}
	} as any;
}

// These tests exercise only the invitation-validity + (token, email) pairing
// guard at the top of POST — the request never reaches the Stripe/hub-role/
// review-assignment business logic further down, so none of that needs to be
// mocked for these cases.
describe('email-reviewer-invitation convert: invitation and pairing guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('requires both token and userId', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ token: 'tok' }));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe('Missing required fields');
		expect(mocks.findEmailReviewerInvitationByToken).not.toHaveBeenCalled();
	});

	it('rejects when the token does not resolve to an active invitation', async () => {
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ token: 'bad-token', userId: 'user-1' }));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBe('Invalid or expired invitation');
		expect(mocks.userFindOne).not.toHaveBeenCalled();
	});

	it('rejects when the invitation is found but inactive (expired/used)', async () => {
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue({
			email: 'ada@example.com',
			hubId: 'hub-1',
			status: 'accepted',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		});
		mocks.isEmailReviewerInvitationActive.mockReturnValue(false);
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ token: 'used-token', userId: 'user-1' }));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBe('Invalid or expired invitation');
	});

	it('rejects when the userId does not resolve to a known account', async () => {
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue({
			email: 'ada@example.com',
			hubId: 'hub-1',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		});
		mocks.isEmailReviewerInvitationActive.mockReturnValue(true);
		mocks.userFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ token: 'valid-token', userId: 'ghost-user' }));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBe('Reviewer account not found');
	});

	it('rejects when the authenticated account email does not match the invitation email', async () => {
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue({
			email: 'invited@example.com',
			hubId: 'hub-1',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		});
		mocks.isEmailReviewerInvitationActive.mockReturnValue(true);
		mocks.userFindOne.mockReturnValue({
			lean: vi.fn().mockResolvedValue({
				id: 'user-1',
				email: 'someone-else@example.com',
				firstName: 'Grace',
				lastName: 'Hopper'
			})
		});
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ token: 'valid-token', userId: 'user-1' }));
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body.error).toBe('This invitation is not valid for the authenticated account');
	});

	it('accepts a case-insensitive email match and proceeds past the guard', async () => {
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue({
			email: 'Ada@Example.com',
			hubId: 'hub-1',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		});
		mocks.isEmailReviewerInvitationActive.mockReturnValue(true);
		mocks.userFindOne.mockReturnValue({
			lean: vi.fn().mockResolvedValue({
				id: 'user-1',
				email: 'ada@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace'
			})
		});
		const { POST } = await import('./+server');

		const response = await POST(createRequestEvent({ token: 'valid-token', userId: 'user-1' }));
		const body = await response.json();

		// Past the guard, the handler moves on to hub lookup (mongoose.model('Hub')
		// is unmocked/unregistered in this isolated test, so it fails there) --
		// the point of this assertion is that we did NOT get rejected by the
		// invitation/pairing guard itself.
		expect(body.error).not.toBe('Invalid or expired invitation');
		expect(body.error).not.toBe('Reviewer account not found');
		expect(body.error).not.toBe('This invitation is not valid for the authenticated account');
	});
});
