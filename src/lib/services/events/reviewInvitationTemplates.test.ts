import { describe, expect, it } from 'vitest';
import type { EventTemplateContext, PlatformEventType } from '$lib/types/EventService';
import { getEventEmailTemplate, getEventNotificationTemplate } from './templates';
import './editorialEventTemplates';
import './reviewInvitationTemplates';

const reviewInvitationEvents: PlatformEventType[] = [
	'review.invitation.created',
	'review.invitation.accepted',
	'review.invitation.declined',
	'review.invitation.expired',
	'review.invitation.resent',
	'review.invitation.cancelled',
	'review.invitation.duplicate'
];

function contextFor(type: PlatformEventType, recipientRole: string): EventTemplateContext {
	return {
		event: {
			type,
			actorId: 'editor-1',
			recipients: [],
			entityType: 'reviewInvitation',
			entityId: 'invite-1',
			idempotencyKey: 'idem-1',
			channels: ['activity', 'notification', 'email'],
			metadata: {
				inviteId: 'invite-1',
				paperId: 'paper-1',
				paperTitle: 'Cancer Study',
				reviewerId: 'reviewer-1',
				reviewerName: 'Ada Reviewer',
				editorId: 'editor-1',
				editorName: 'Ed Editor',
				recipientRoles: {
					'recipient-1': recipientRole
				}
			}
		},
		recipient: {
			userId: 'recipient-1',
			channels: ['activity', 'notification', 'email'],
			idempotencyKey: 'idem-1',
			eventKey: 'event-1'
		}
	};
}

describe('review invitation event templates', () => {
	it.each(reviewInvitationEvents)('has notification and email templates for %s', async (type) => {
		const notificationTemplate = getEventNotificationTemplate(type);
		const emailTemplate = getEventEmailTemplate(type);

		expect(notificationTemplate).toBeTypeOf('function');
		expect(emailTemplate).toBeTypeOf('function');
		expect(await notificationTemplate?.(contextFor(type, 'reviewer'))).toMatchObject({
			title: expect.any(String),
			content: expect.any(String)
		});
		expect(await emailTemplate?.(contextFor(type, 'reviewer'))).toMatchObject({
			subject: expect.any(String),
			text: expect.any(String)
		});
	});

	it('creates role-specific templates for reviewer, editor, and author recipients', async () => {
		const notificationTemplate = getEventNotificationTemplate('review.invitation.accepted');
		const emailTemplate = getEventEmailTemplate('review.invitation.accepted');

		for (const role of ['reviewer', 'editor', 'author']) {
			expect(await notificationTemplate?.(contextFor('review.invitation.accepted', role))).toBeTruthy();
			expect(await emailTemplate?.(contextFor('review.invitation.accepted', role))).toBeTruthy();
		}
	});

	it.each([
		['review.invitation.accepted', 'author'],
		['review.invitation.declined', 'author'],
		['review.invitation.expired', 'author'],
		['review.invitation.cancelled', 'author'],
		['review.invitation.duplicate', 'reviewer']
	] as Array<[PlatformEventType, string]>)(
		'creates notification and email templates for %s as %s',
		async (type, role) => {
			const notificationTemplate = getEventNotificationTemplate(type);
			const emailTemplate = getEventEmailTemplate(type);

			expect(await notificationTemplate?.(contextFor(type, role))).toMatchObject({
				title: expect.any(String),
				content: expect.any(String)
			});
			expect(await emailTemplate?.(contextFor(type, role))).toMatchObject({
				subject: expect.any(String),
				text: expect.any(String)
			});
		}
	);

	it.each(['reviewer', 'editor', 'author'])(
		'creates reviewer removal templates for %s recipients',
		async (role) => {
			const notificationTemplate = getEventNotificationTemplate('review.assignment.removed');
			const emailTemplate = getEventEmailTemplate('review.assignment.removed');

			expect(
				await notificationTemplate?.(contextFor('review.assignment.removed', role))
			).toMatchObject({
				title: expect.any(String),
				content: expect.any(String)
			});
			expect(await emailTemplate?.(contextFor('review.assignment.removed', role))).toMatchObject({
				subject: expect.any(String),
				text: expect.any(String)
			});
		}
	);
});
