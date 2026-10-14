import { describe, expect, it, vi } from 'vitest';
import {
	dispatchPendingAuthorInvitations,
	mergePendingAuthorInvitations,
	normalizePendingAuthorInvitations
} from './pendingAuthorInvitations';

/**
 * Adding a co-author used to create an account and mail the person on the
 * spot, from a form that had not been saved. These tests pin the replacement:
 * nothing goes out until the paper is persisted, and nothing goes out twice.
 */
describe('normalizePendingAuthorInvitations', () => {
	it('keeps only entries with a usable address, normalizing it', () => {
		const result = normalizePendingAuthorInvitations([
			{ email: '  Ada@Example.COM  ', firstName: 'Ada' },
			{ email: 'not-an-email', firstName: 'Nope' },
			{ firstName: 'No address at all' }
		]);

		expect(result).toHaveLength(1);
		expect(result[0].email).toBe('ada@example.com');
		expect(result[0].firstName).toBe('Ada');
	});

	it('drops a repeated address so one person is not invited twice', () => {
		const result = normalizePendingAuthorInvitations([
			{ email: 'ada@example.com' },
			{ email: 'ADA@example.com' }
		]);

		expect(result).toHaveLength(1);
	});

	it('refuses an inviteSentAt coming from the client', () => {
		// A client that could set it would silence an invitation; one that could
		// clear it would force a resend. The server owns this field.
		const result = normalizePendingAuthorInvitations([
			{ email: 'ada@example.com', inviteSentAt: new Date('2020-01-01') }
		]);

		expect(result[0].inviteSentAt).toBeUndefined();
	});

	it('keeps each author in its place', () => {
		const result = normalizePendingAuthorInvitations([
			{ email: 'second@example.com', order: 2 },
			{ email: 'first@example.com', order: 1 }
		]);

		expect(result.map((entry) => entry.order)).toEqual([2, 1]);
	});

	it('returns nothing for a non-array payload', () => {
		expect(normalizePendingAuthorInvitations(undefined)).toEqual([]);
		expect(normalizePendingAuthorInvitations('nope')).toEqual([]);
	});
});

describe('mergePendingAuthorInvitations', () => {
	it('carries a previous send forward so a second save does not re-invite', () => {
		const sentAt = new Date('2026-10-09T12:00:00.000Z');
		const merged = mergePendingAuthorInvitations(
			[{ id: 'p1', email: 'ada@example.com', inviteSentAt: sentAt }],
			// The client regenerated its local id; matching is by address.
			[{ id: 'regenerated', email: 'ada@example.com' }]
		);

		expect(merged[0].inviteSentAt).toBe(sentAt);
		expect(merged[0].id).toBe('p1');
	});

	it('leaves a newly added author unsent', () => {
		const merged = mergePendingAuthorInvitations(
			[{ id: 'p1', email: 'ada@example.com', inviteSentAt: new Date() }],
			[
				{ id: 'p1', email: 'ada@example.com' },
				{ id: 'p2', email: 'grace@example.com' }
			]
		);

		expect(merged[0].inviteSentAt).toBeTruthy();
		expect(merged[1].inviteSentAt).toBeUndefined();
	});

	it('does not resurrect an author the user removed', () => {
		const merged = mergePendingAuthorInvitations(
			[{ id: 'p1', email: 'ada@example.com', inviteSentAt: new Date() }],
			[]
		);

		expect(merged).toEqual([]);
	});
});

describe('dispatchPendingAuthorInvitations', () => {
	it('sends the pending ones and marks them', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const now = () => new Date('2026-10-09T12:00:00.000Z');

		const { invitations, results } = await dispatchPendingAuthorInvitations({
			invitations: [{ id: 'p1', email: 'ada@example.com' }],
			send,
			now
		});

		expect(send).toHaveBeenCalledTimes(1);
		expect(results[0]).toMatchObject({ email: 'ada@example.com', status: 'sent' });
		expect(invitations[0].inviteSentAt).toEqual(now());
	});

	it('skips an invitation already sent, however many times the draft is saved', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sentAt = new Date('2026-10-01T00:00:00.000Z');

		const { invitations, results } = await dispatchPendingAuthorInvitations({
			invitations: [{ id: 'p1', email: 'ada@example.com', inviteSentAt: sentAt }],
			send
		});

		expect(send).not.toHaveBeenCalled();
		expect(results[0]).toMatchObject({ status: 'skipped', reason: 'already_sent' });
		// The original timestamp is untouched, so it stays skipped forever.
		expect(invitations[0].inviteSentAt).toBe(sentAt);
	});

	it('one failing address does not stop the others', async () => {
		const send = vi
			.fn()
			.mockRejectedValueOnce(new Error('550 mailbox unavailable'))
			.mockResolvedValueOnce(undefined);

		const { invitations, results } = await dispatchPendingAuthorInvitations({
			invitations: [
				{ id: 'p1', email: 'bad@example.invalid' },
				{ id: 'p2', email: 'good@example.com' }
			],
			send
		});

		expect(send).toHaveBeenCalledTimes(2);
		expect(results[0]).toMatchObject({ status: 'failed', error: '550 mailbox unavailable' });
		expect(results[1]).toMatchObject({ status: 'sent' });
	});

	it('leaves a failed invitation pending so the next save retries it', async () => {
		const send = vi.fn().mockRejectedValue(new Error('smtp down'));

		const { invitations } = await dispatchPendingAuthorInvitations({
			invitations: [{ id: 'p1', email: 'ada@example.com' }],
			send
		});

		expect(invitations[0].inviteSentAt).toBeUndefined();
		expect(invitations[0].lastInviteError).toBe('smtp down');
	});

	it('never throws, so a send failure cannot undo a saved draft', async () => {
		const send = vi.fn().mockRejectedValue(new Error('boom'));

		await expect(
			dispatchPendingAuthorInvitations({
				invitations: [{ id: 'p1', email: 'ada@example.com' }],
				send
			})
		).resolves.toBeTruthy();
	});

	it('does nothing at all when there is nothing pending', async () => {
		const send = vi.fn();

		const { invitations, results } = await dispatchPendingAuthorInvitations({
			invitations: [],
			send
		});

		expect(send).not.toHaveBeenCalled();
		expect(invitations).toEqual([]);
		expect(results).toEqual([]);
	});
});
