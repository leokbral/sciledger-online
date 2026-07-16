import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findEmailReviewerInvitationByToken: vi.fn(),
	isEmailReviewerInvitationActive: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/server/auth/emailReviewerInvitation', () => ({
	findEmailReviewerInvitationByToken: mocks.findEmailReviewerInvitationByToken,
	isEmailReviewerInvitationActive: mocks.isEmailReviewerInvitationActive
}));

function createEvent(token?: string) {
	const url = new URL('https://sciledger.online/invite/register');
	if (token) url.searchParams.set('token', token);
	return { url } as any;
}

describe('invite/register invitation lookup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('requires a token', async () => {
		const { GET } = await import('./+server');

		const response = await GET(createEvent());

		expect(response.status).toBe(400);
		expect(mocks.findEmailReviewerInvitationByToken).not.toHaveBeenCalled();
	});

	it('returns 404 when the token does not resolve to any invitation', async () => {
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue(null);
		const { GET } = await import('./+server');

		const response = await GET(createEvent('missing-token'));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBe('Invalid invitation token');
	});

	it('marks an expired-but-still-pending invitation as expired and returns 410', async () => {
		const invitation = {
			email: 'ada@example.com',
			hubId: 'hub-1',
			status: 'pending',
			expiresAt: new Date('2020-01-01T00:00:00.000Z'),
			save: vi.fn().mockResolvedValue(undefined)
		};
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue(invitation);
		mocks.isEmailReviewerInvitationActive.mockReturnValue(false);
		const { GET } = await import('./+server');

		const response = await GET(createEvent('expired-token'));
		const body = await response.json();

		expect(response.status).toBe(410);
		expect(body.error).toBe('Invitation has expired');
		expect(invitation.status).toBe('expired');
		expect(invitation.save).toHaveBeenCalled();
	});

	it('returns 400 for an invitation that is no longer pending (accepted/declined)', async () => {
		const invitation = {
			email: 'ada@example.com',
			hubId: 'hub-1',
			status: 'accepted',
			expiresAt: new Date('2099-01-01T00:00:00.000Z'),
			save: vi.fn()
		};
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue(invitation);
		mocks.isEmailReviewerInvitationActive.mockReturnValue(false);
		const { GET } = await import('./+server');

		const response = await GET(createEvent('used-token'));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe('Invitation has already been used');
		expect(invitation.save).not.toHaveBeenCalled();
	});

	it('returns the invitation details when active', async () => {
		const invitation = {
			email: 'ada@example.com',
			hubId: 'hub-1',
			paperId: 'paper-1',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		};
		mocks.findEmailReviewerInvitationByToken.mockResolvedValue(invitation);
		mocks.isEmailReviewerInvitationActive.mockReturnValue(true);
		const { GET } = await import('./+server');

		const response = await GET(createEvent('valid-token'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			valid: true,
			email: 'ada@example.com',
			hubId: 'hub-1',
			paperId: 'paper-1'
		});
	});
});
