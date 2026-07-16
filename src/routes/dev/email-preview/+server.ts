import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { PaperLifecycleEmailService } from '$lib/services/PaperLifecycleEmailService';
import {
	buildCoAuthorWelcomeEmailHtml,
	buildPasswordResetEmailHtml,
	buildReviewerInvitationEmailHtml
} from '$lib/services/platformEmailTemplates';
import {
	getAllEventEmailTemplates,
	getAllEventNotificationTemplates
} from '$lib/services/events/templates';
import '$lib/services/events/editorialEventTemplates';
import '$lib/services/events/reviewInvitationTemplates';
import type { EventTemplateContext, PlatformEventType } from '$lib/types/EventService';

const sampleMetadata = {
	paperId: 'preview-paper-id',
	paperTitle: 'A Multi-Phase Approach to Transparent Peer Review',
	hubId: 'preview-hub-id',
	hubName: 'Open Science Hub',
	reviewId: 'preview-review-id',
	reviewerName: 'Dr. Jane Reviewer',
	editorName: 'Prof. John Editor',
	actorName: 'Editorial Team',
	targetUserName: 'Dr. Alice Author',
	inviteeName: 'Dr. Reviewer Invitee',
	inviterName: 'Prof. Nelson Editor',
	roleKey: 'reviewer',
	roleName: 'Reviewer',
	deadline: '2026-07-15',
	previousDeadline: '2026-07-01',
	reminderType: 'final',
	daysRemaining: 2,
	amount: 7500,
	currency: 'USD',
	paymentStatus: 'captured',
	failureReason: 'Card declined',
	reason: 'Completed successfully',
	acceptanceType: 'review',
	decision: 'accept',
	finalDecision: 'accept',
	rejectionReason: 'Insufficient novelty',
	correctionReason: 'formatting',
	reviewDecision: 'accept_with_minor_revisions',
	recipientRoles: {
		'user-author': 'author',
		'user-reviewer': 'reviewer',
		'user-editor': 'editor',
		'user-invitee': 'invitee',
		'user-target': 'target'
	},
	inviteId: 'preview-invite-id'
};

function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function escapeAttribute(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function sampleEntityType(type: string): string {
	if (type.startsWith('hub.')) return 'hub';
	if (type.startsWith('role.')) return 'role';
	if (type.startsWith('payment.') || type === 'reviewer.payout.paid') return 'payment';
	if (type.startsWith('review.')) return 'review';
	return 'paper';
}

function recipientForType(type: string) {
	if (type.startsWith('review.invitation.') || type.startsWith('hub.invitation.')) {
		return 'user-invitee';
	}

	if (type.startsWith('role.') || type.startsWith('hub.')) {
		return 'user-editor';
	}

	if (
		type.startsWith('review.assignment') ||
		type.startsWith('review.deadline') ||
		type === 'review.submitted'
	) {
		return 'user-reviewer';
	}

	return 'user-author';
}

function buildSampleContext(type: PlatformEventType): EventTemplateContext {
	return {
		event: {
			type,
			actorId: 'user-editor',
			recipients: [
				{
					userId: recipientForType(type),
					channels: ['activity', 'notification', 'email'],
					idempotencyKey: 'preview-id',
					eventKey: `preview-${type}`
				}
			],
			entityType: sampleEntityType(type) as any,
			entityId: ['hub.', 'role.'].some((prefix) => type.startsWith(prefix))
				? sampleMetadata.hubId
				: sampleMetadata.paperId,
			idempotencyKey: 'preview-event-id',
			metadata: sampleMetadata,
			channels: ['activity', 'notification', 'email']
		},
		recipient: {
			userId: recipientForType(type),
			channels: ['activity', 'notification', 'email'],
			idempotencyKey: 'preview-id',
			eventKey: `preview-${type}`
		}
	};
}

function renderEmailPreview(payload: { html?: string; text: string }): string {
	if (!payload.html) {
		return `<pre class="preview-text">${escapeHtml(payload.text)}</pre>`;
	}

	const srcdoc = escapeAttribute(payload.html);
	return `<iframe class="email-frame" srcdoc="${srcdoc}" sandbox="allow-same-origin allow-scripts"></iframe>`;
}

function renderNotificationPreview(payload: {
	title: string;
	content: string;
	actionUrl?: string;
}): string {
	return `<div class="notification-card"><strong>${escapeHtml(payload.title)}</strong><p>${escapeHtml(payload.content)}</p>${payload.actionUrl ? `<p><em>Action URL:</em> ${escapeHtml(payload.actionUrl)}</p>` : ''}</div>`;
}

function generateCoAuthorWelcomeEmailTemplate(): { subject: string; html: string; text: string } {
	const htmlContent = buildCoAuthorWelcomeEmailHtml({
		coAuthorName: 'Dr. Alice Author',
		inviterName: 'Prof. Nelson Editor',
		projectTitle: 'Open Research Collaboration',
		loginUrl: 'https://preview.sciledger.online/login'
	});

	const textContent = `
      Welcome to SciLedger !

      Hello Dr. Alice Author,

      Great news! You have been added as a co-author on SciLedger platform by Prof. Nelson Editor.

      You are now a collaborator on the project: Open Research Collaboration

      SciLedger is a collaborative platform designed for scientific research and publication management. As a co-author, you can:
      - Collaborate on research projects
      - Manage and edit scientific documents
      - Track publication progress
      - Communicate with your research team

      To get started, please visit: https://preview.sciledger.online/login

      If you're new to the platform, you can use your email address to log in and set up your profile.

      If you have any questions or need assistance, please don't hesitate to contact our support team.

      Best regards,
      The SciLedger Online Team

      This is an automated message. Please do not reply to this email.
    `;

	return {
		subject: "Welcome to SciLedger Online - You've been added as a Co-Author",
		html: htmlContent,
		text: textContent
	};
}
function renderEmailSection(
	title: string,
	subject: string,
	payload: { html?: string; text: string }
) {
	return `
		<div class="card">
			<h2>${escapeHtml(title)}</h2>
			<div class="subject">Subject: ${escapeHtml(subject)}</div>
			<div class="preview-container">${renderEmailPreview(payload)}</div>
			<div class="plain-text">
				<pre>${escapeHtml(payload.text)}</pre>
			</div>
		</div>
	`;
}

function renderNotificationSection(
	title: string,
	payload: { title: string; content: string; actionUrl?: string }
) {
	return `
		<div class="card">
			<h2>${escapeHtml(title)}</h2>
			<div class="subject">Title: ${escapeHtml(payload.title)}</div>
			<div class="preview-container">${renderNotificationPreview(payload)}</div>
		</div>
	`;
}

export const GET: RequestHandler = async ({ url }) => {
	if (env.NODE_ENV === 'production') {
		return new Response('Not found', { status: 404 });
	}

	const paperTitle = url.searchParams.get('title') || sampleMetadata.paperTitle;
	const recipientName = url.searchParams.get('name') || 'Dr. Jane Doe';
	const paperId = url.searchParams.get('paperId') || sampleMetadata.paperId;
	const submittedByName = url.searchParams.get('submittedBy') || 'Dr. John Smith';
	const acceptedByName = url.searchParams.get('acceptedBy') || 'Editorial Board';

	const submissionEmail = PaperLifecycleEmailService.buildSubmissionEmailPayload({
		recipientName,
		paperId,
		paperTitle,
		submittedByName
	});

	const acceptedReviewEmail = PaperLifecycleEmailService.buildAcceptedEmailPayload({
		recipientName,
		paperId,
		paperTitle,
		acceptedByName,
		acceptanceType: 'review'
	});

	const acceptedPublicationEmail = PaperLifecycleEmailService.buildAcceptedEmailPayload({
		recipientName,
		paperId,
		paperTitle,
		acceptedByName,
		acceptanceType: 'publication'
	});

	const hubAdminEmail = PaperLifecycleEmailService.buildHubAdminSubmissionEmailPayload({
		recipientName,
		hubName: sampleMetadata.hubName,
		paperId,
		paperTitle,
		submittedByName
	});

	const reviewerInvitationEmail = {
		subject: '📝 Invitation to Join as Reviewer - SciLedger',
		html: buildReviewerInvitationEmailHtml({
			hubName: sampleMetadata.hubName,
			invitationUrl: 'https://preview.sciledger.online/invite/register?token=preview-token',
			declineUrl: 'https://preview.sciledger.online/invite/decline?token=preview-token',
			paperTitle,
			paperAbstract: 'This paper explores a transparent peer review workflow over three phases.'
		}),
		text: `You have been invited to review ${paperTitle}. Accept or decline using the provided links.`
	};

	const passwordResetEmail = {
		subject: '🔐 Reset Password - SciLedger',
		html: buildPasswordResetEmailHtml(
			recipientName,
			'https://preview.sciledger.online/reset?token=preview-reset-token'
		),
		text: `Hello ${recipientName},\n\nUse this link to reset your password: https://preview.sciledger.online/reset?token=preview-reset-token`
	};

	const coAuthorEmail = generateCoAuthorWelcomeEmailTemplate();

	const emailTemplates = getAllEventEmailTemplates();
	const notificationTemplates = getAllEventNotificationTemplates();

	const eventEmailSections = await Promise.all(
		emailTemplates.map(async ({ type, template }) => {
			const payload = await Promise.resolve(
				template(buildSampleContext(type as PlatformEventType))
			);
			if (!payload) {
				return `<div class="card"><h2>${escapeHtml(type)}</h2><div class="subject">No email payload generated.</div></div>`;
			}

			return renderEmailSection(`Event Email: ${type}`, payload.subject, {
				html: payload.html || '',
				text: payload.text
			});
		})
	);

	const eventNotificationSections = await Promise.all(
		notificationTemplates.map(async ({ type, template }) => {
			const payload = await Promise.resolve(
				template(buildSampleContext(type as PlatformEventType))
			);
			if (!payload) {
				return `<div class="card"><h2>${escapeHtml(type)}</h2><div class="subject">No notification payload generated.</div></div>`;
			}

			return renderNotificationSection(`Event Notification: ${type}`, payload);
		})
	);

	const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>SciLedger Email & Notification Preview</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f4f7fb; color: #1f2937; }
		h1 { margin-top: 0; }
		.card { background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 18px; margin-bottom: 24px; }
		.meta { font-size: 14px; color: #475569; margin-bottom: 8px; }
		.subject { font-weight: bold; margin: 8px 0 12px 0; }
		.preview-container { margin-bottom: 16px; }
		.email-frame { width: 100%; min-height: 350px; border: 1px solid #cbd5e1; border-radius: 8px; }
		.preview-text { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; overflow-x: auto; }
		.plain-text pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
		.notification-card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; }
		.notification-card p { margin: 8px 0; }
		.notification-card em { color: #475569; }
		section { margin-bottom: 36px; }
		section h2 { font-size: 20px; margin-bottom: 12px; }
		.nav { margin-bottom: 24px; }
		.nav a { color: #0369a1; text-decoration: none; margin-right: 14px; }
		.nav a:hover { text-decoration: underline; }
	</style>
</head>
<body>
	<h1>SciLedger Email & Notification Preview</h1>
	<p class="meta">Use query params to customize preview: <code>?title=...&name=...&paperId=...&submittedBy=...&acceptedBy=...</code></p>
	<div class="nav">
		<a href="#direct-emails">Direct email layouts</a>
		<a href="#event-emails">Event-driven emails</a>
		<a href="#event-notifications">Event-driven notifications</a>
	</div>

	<section id="direct-emails">
		<h2>Direct email layouts</h2>
		${renderEmailSection('Submission Confirmation', submissionEmail.subject, submissionEmail)}
		${renderEmailSection('Acceptance for Review', acceptedReviewEmail.subject, acceptedReviewEmail)}
		${renderEmailSection('Approval for Publication', acceptedPublicationEmail.subject, acceptedPublicationEmail)}
		${renderEmailSection('Hub Admin Submission', hubAdminEmail.subject, hubAdminEmail)}
		${renderEmailSection('Reviewer Invitation Email', reviewerInvitationEmail.subject, reviewerInvitationEmail)}
		${renderEmailSection('Password Reset Email', passwordResetEmail.subject, passwordResetEmail)}
		${renderEmailSection('Co-Author Welcome Email', coAuthorEmail.subject, coAuthorEmail)}
	</section>

	<section id="event-emails">
		<h2>Event-driven email templates</h2>
		${eventEmailSections.join('\n')}
	</section>

	<section id="event-notifications">
		<h2>Event-driven notification templates</h2>
		${eventNotificationSections.join('\n')}
	</section>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8'
		}
	});
};
