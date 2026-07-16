import { describe, expect, it } from 'vitest';
import { createEmailLayout } from '$lib/services/emailDesignSystem';
import { buildReviewerInvitationEmailHtml } from '$lib/services/platformEmailTemplates';
import { platformEventTypes, type EventTemplateContext } from '$lib/types/EventService';
import { getEventEmailTemplate } from './templates';
import './editorialEventTemplates';
import './reviewInvitationTemplates';

const internalObjectId = '507f1f77bcf86cd799439011';
const internalUuid = '550e8400-e29b-41d4-a716-446655440000';

function contextFor(type: (typeof platformEventTypes)[number]): EventTemplateContext {
	return {
		event: {
			type,
			actorId: 'actor-1',
			recipients: [],
			entityType: type.startsWith('review.invitation.')
				? 'reviewInvitation'
				: type.startsWith('review.')
					? 'review'
					: type.startsWith('hub.')
						? 'hub'
						: type.startsWith('role.')
							? 'role'
							: 'paper',
			entityId: 'entity-1',
			idempotencyKey: 'idem-1',
			channels: ['activity', 'notification', 'email'],
			metadata: {
				paperId: 'paper-1',
				paperTitle: 'Clinical <em>Trial</em>',
				hubId: 'hub-1',
				hubName: 'SciLedger Research Hub',
				reviewerName: internalObjectId,
				editorName: 'Ed Editor',
				authorName: 'Ana Author',
				targetUserName: 'Taylor Target',
				inviteeName: 'Ivy Invitee',
				roleName: 'Managing Editor',
				deadline: '2026-07-15T12:00:00.000Z',
				invitedAt: '2026-07-02T12:00:00.000Z',
				publishedAt: '2026-07-20T12:00:00.000Z',
				decision: 'accept_with_minor_revisions',
				reason: `Internal note ${internalUuid}`,
				amount: 16000,
				currency: 'BRL',
				paymentStatus: 'authorized',
				status: 'pending',
				recipientRoles: {
					'recipient-1': 'reviewer'
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

describe('institutional event email layout', () => {
	it.each(platformEventTypes)('renders the institutional layout for %s', async (type) => {
		const template = getEventEmailTemplate(type);
		const payload = await template?.(contextFor(type));

		expect(payload?.html).toContain('SciLedger');
		expect(payload?.html).toContain('Additional information');
		expect(payload?.html).toContain('This is an automated message. Please do not reply.');
		expect(payload?.html).toContain('href=');
		expect(payload?.html).not.toContain('<em>Trial</em>');
		expect(payload?.html).not.toContain(internalObjectId);
		expect(payload?.html).not.toContain(internalUuid);
		expect(payload?.text).not.toContain(internalObjectId);
		expect(payload?.text).not.toContain(internalUuid);
	});

	it.each([
		['paper.created', 'DOC'],
		['review.submitted', 'REV'],
		['review.invitation.created', 'INV'],
		['hub.created', 'HUB'],
		['role.created', 'ROLE'],
		['payment.hold.authorized', 'PAY']
	] as const)('uses the expected event badge for %s', async (type, badge) => {
		const template = getEventEmailTemplate(type);
		const payload = await template?.(contextFor(type));

		expect(payload?.html).toContain(`>${badge}</div>`);
	});

	it('uses the reviewer invitation visual system as the shared base layout', () => {
		const html = createEmailLayout({
			title: 'Shared Layout Check',
			subtitle: 'Design system',
			message: 'This email should use the institutional wrapper.',
			actionLabel: 'Open SciLedger',
			actionUrl: 'https://sciledger.online/dashboard',
			fallbackUrl: 'https://sciledger.online/dashboard',
			warning: 'This is a shared warning card.'
		});

		expect(html).toContain('background-color: #07326a');
		expect(html).toContain('Scientific Platform');
		expect(html).toContain('box-shadow: 0 2px 10px rgba(0,0,0,0.1)');
		expect(html).toContain('Open SciLedger');
		expect(html).toContain('This is a shared warning card.');
	});

	it('renders the direct reviewer invitation from the same design system', () => {
		const html = buildReviewerInvitationEmailHtml({
			hubName: 'Open Science Hub',
			invitationUrl: 'https://sciledger.online/invite/register?token=abc123',
			declineUrl: 'https://sciledger.online/invite/decline?token=abc123',
			paperTitle: 'Transparent <em>Review</em>',
			paperAbstract: '<p>Abstract with <strong>markup</strong>.</p><script>alert(1)</script>'
		});

		expect(html).toContain('You&#039;ve Been Invited to Join as a Reviewer');
		expect(html).toContain('Accept Invitation &amp; Register');
		expect(html).toContain('Decline Invitation');
		expect(html).toContain('This invitation link will expire in 7 days.');
		expect(html).toContain('Transparent Review');
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('<em>Review</em>');
	});
});
