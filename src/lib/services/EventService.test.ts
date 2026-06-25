import { describe, expect, it } from 'vitest';
import { buildEventIdempotencyKey, buildRecipientEventKey } from './EventService';

describe('EventService idempotency keys', () => {
	it('builds a stable idempotency key for the same event scope', () => {
		const input = {
			type: 'review.invitation.created',
			actorId: 'editor-1',
			recipients: ['reviewer-1'],
			entityType: 'reviewInvitation',
			entityId: 'invite-1',
			metadata: {
				inviteId: 'invite-1',
				paperId: 'paper-1'
			}
		};

		expect(buildEventIdempotencyKey(input)).toBe(buildEventIdempotencyKey(input));
	});

	it('builds different recipient event keys for the same event', () => {
		const idempotencyKey = buildEventIdempotencyKey({
			type: 'paper.submitted',
			recipients: ['author-1', 'editor-1'],
			entityType: 'paper',
			entityId: 'paper-1'
		});

		expect(buildRecipientEventKey(idempotencyKey, 'author-1')).not.toBe(
			buildRecipientEventKey(idempotencyKey, 'editor-1')
		);
	});

	it('keeps distinct paper lifecycle transitions on the same paper separate', () => {
		const reviewAcceptanceKey = buildEventIdempotencyKey({
			type: 'paper.accepted',
			recipients: ['author-1'],
			entityType: 'paper',
			entityId: 'paper-1',
			metadata: {
				action: 'paper.sendToReview',
				acceptanceType: 'review'
			}
		});
		const finalAcceptanceKey = buildEventIdempotencyKey({
			type: 'paper.accepted',
			recipients: ['author-1'],
			entityType: 'paper',
			entityId: 'paper-1',
			metadata: {
				action: 'paper.accept',
				acceptanceType: 'final'
			}
		});

		expect(reviewAcceptanceKey).not.toBe(finalAcceptanceKey);
	});
});
