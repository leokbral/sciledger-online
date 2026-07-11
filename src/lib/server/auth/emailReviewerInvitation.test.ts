import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	findEmailReviewerInvitationByToken,
	findValidEmailReviewerInvitation,
	isEmailReviewerInvitationActive,
	type EmailReviewerInvitationRecord
} from './emailReviewerInvitation';

function createModel(
	findOneImpl: (query: Record<string, unknown>) => EmailReviewerInvitationRecord | null
) {
	return { findOne: vi.fn(async (query: Record<string, unknown>) => findOneImpl(query)) };
}

describe('isEmailReviewerInvitationActive', () => {
	it('is active only while pending and before expiry', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');

		expect(
			isEmailReviewerInvitationActive(
				{ status: 'pending', expiresAt: new Date('2026-07-10T12:00:01.000Z') },
				now
			)
		).toBe(true);
		expect(
			isEmailReviewerInvitationActive(
				{ status: 'pending', expiresAt: new Date('2026-07-10T12:00:00.000Z') },
				now
			)
		).toBe(false);
		expect(
			isEmailReviewerInvitationActive(
				{ status: 'accepted', expiresAt: new Date('2099-01-01T00:00:00.000Z') },
				now
			)
		).toBe(false);
		expect(
			isEmailReviewerInvitationActive(
				{ status: 'expired', expiresAt: new Date('2099-01-01T00:00:00.000Z') },
				now
			)
		).toBe(false);
	});
});

describe('findEmailReviewerInvitationByToken', () => {
	it('returns null without querying when the token is missing or blank', async () => {
		const model = createModel(() => {
			throw new Error('should not query the database without a token');
		});

		expect(await findEmailReviewerInvitationByToken(undefined, model)).toBeNull();
		expect(await findEmailReviewerInvitationByToken('   ', model)).toBeNull();
		expect(model.findOne).not.toHaveBeenCalled();
	});

	it('queries strictly by token, leaving validity judgment to the caller', async () => {
		const invitation: EmailReviewerInvitationRecord = {
			email: 'ada@example.com',
			hubId: 'hub-1',
			token: 'some-token',
			status: 'expired',
			expiresAt: new Date('2020-01-01T00:00:00.000Z')
		};
		const model = createModel(() => invitation);

		const result = await findEmailReviewerInvitationByToken('some-token', model);

		expect(result).toBe(invitation);
		expect(model.findOne).toHaveBeenCalledWith({ token: 'some-token' });
	});
});

describe('findValidEmailReviewerInvitation', () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it('returns null when no invite token is provided', async () => {
		const model = createModel(() => {
			throw new Error('should not query the database without a token');
		});

		expect(await findValidEmailReviewerInvitation(undefined, 'ada@example.com', model)).toBeNull();
		expect(model.findOne).not.toHaveBeenCalled();
	});

	it('returns null when the token does not resolve to any invitation', async () => {
		const model = createModel(() => null);

		expect(await findValidEmailReviewerInvitation('missing', 'ada@example.com', model)).toBeNull();
	});

	it('returns null when the invitation is expired even if the email matches', async () => {
		const model = createModel(() => ({
			email: 'ada@example.com',
			hubId: 'hub-1',
			token: 'valid-token',
			status: 'pending',
			expiresAt: new Date('2020-01-01T00:00:00.000Z')
		}));

		expect(await findValidEmailReviewerInvitation('valid-token', 'ada@example.com', model)).toBeNull();
	});

	it('returns null when the invitation was already used even if the email matches', async () => {
		const model = createModel(() => ({
			email: 'ada@example.com',
			hubId: 'hub-1',
			token: 'valid-token',
			status: 'accepted',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		}));

		expect(await findValidEmailReviewerInvitation('valid-token', 'ada@example.com', model)).toBeNull();
	});

	it('returns null when the invitation email does not match the checked email', async () => {
		const model = createModel(() => ({
			email: 'someone-else@example.com',
			hubId: 'hub-1',
			token: 'valid-token',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		}));

		expect(await findValidEmailReviewerInvitation('valid-token', 'ada@example.com', model)).toBeNull();
	});

	it('returns the invitation when the token is active and the email matches (case-insensitively)', async () => {
		const invitation: EmailReviewerInvitationRecord = {
			email: 'Ada@Example.com',
			hubId: 'hub-1',
			token: 'valid-token',
			status: 'pending',
			expiresAt: new Date('2099-01-01T00:00:00.000Z')
		};
		const model = createModel(() => invitation);

		const result = await findValidEmailReviewerInvitation('valid-token', 'ada@example.com', model);

		expect(result).toBe(invitation);
	});
});
