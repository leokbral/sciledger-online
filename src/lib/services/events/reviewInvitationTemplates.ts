import type {
	EventEmailPayload,
	EventNotificationPayload,
	EventTemplateContext
} from '$lib/types/EventService';
import { registerEventEmailTemplate, registerEventNotificationTemplate } from './templates';

type InvitationMetadata = {
	inviteId?: string;
	paperId?: string;
	hubId?: string | null;
	paperTitle?: string;
	reviewerId?: string;
	reviewerName?: string;
	editorId?: string;
	editorName?: string;
	actorName?: string;
	expiresAt?: string;
	resendCount?: number;
	recipientRoles?: Record<string, string>;
};

function metadata(context: EventTemplateContext): InvitationMetadata {
	return context.event.metadata as InvitationMetadata;
}

function roleFor(context: EventTemplateContext) {
	return metadata(context).recipientRoles?.[context.recipient.userId] || 'recipient';
}

function paperTitle(context: EventTemplateContext) {
	return metadata(context).paperTitle || 'the paper';
}

function paperUrl(context: EventTemplateContext) {
	const data = metadata(context);
	return data.paperId ? `/publish/view/${data.paperId}` : '/notifications';
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function notificationPayload(
	context: EventTemplateContext,
	title: string,
	content: string,
	priority: EventNotificationPayload['priority'] = 'medium',
	type: EventNotificationPayload['type'] = 'system'
): EventNotificationPayload {
	const data = metadata(context);
	return {
		type,
		title,
		content,
		relatedPaperId: data.paperId,
		relatedHubId: data.hubId || undefined,
		actionUrl: paperUrl(context),
		priority,
		metadata: {
			...context.event.metadata,
			inviteId: data.inviteId
		}
	};
}

function emailPayload(title: string, content: string): EventEmailPayload {
	return {
		subject: title,
		text: `${content}\n\nOpen SciLedger to view the latest details.`,
		html: `<p>${escapeHtml(content)}</p><p>Open SciLedger to view the latest details.</p>`
	};
}

registerEventNotificationTemplate('review.invitation.created', (context) => {
	const data = metadata(context);
	const role = roleFor(context);

	if (role === 'reviewer') {
		return notificationPayload(
			context,
			'New Paper Review Request',
			`You have been invited to review "${paperTitle(context)}".`,
			'high',
			'review_request'
		);
	}

	return notificationPayload(
		context,
		'Review Invitation Sent',
		`Invitation sent to ${data.reviewerName || 'the reviewer'} for "${paperTitle(context)}".`,
		'medium'
	);
});

registerEventEmailTemplate('review.invitation.created', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `You have been invited to review "${paperTitle(context)}".`
			: `Invitation sent to ${data.reviewerName || 'the reviewer'} for "${paperTitle(context)}".`;
	return emailPayload(
		role === 'reviewer' ? 'New Paper Review Request' : 'Review Invitation Sent',
		content
	);
});

registerEventNotificationTemplate('review.invitation.accepted', (context) => {
	const data = metadata(context);
	const role = roleFor(context);

	if (role === 'reviewer') {
		return notificationPayload(
			context,
			'Review Invitation Accepted',
			`You accepted the invitation to review "${paperTitle(context)}".`,
			'medium',
			'reviewer_accepted_review'
		);
	}

	if (role === 'author') {
		return notificationPayload(
			context,
			'Reviewer Accepted',
			`${data.reviewerName || 'A reviewer'} accepted the invitation to review "${paperTitle(context)}".`,
			'medium',
			'reviewer_accepted_review'
		);
	}

	return notificationPayload(
		context,
		'Reviewer Accepted Paper Review',
		`${data.reviewerName || 'A reviewer'} accepted the invitation to review "${paperTitle(context)}".`,
		'medium',
		'reviewer_accepted_review'
	);
});

registerEventEmailTemplate('review.invitation.accepted', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `You accepted the invitation to review "${paperTitle(context)}".`
			: role === 'author'
				? `${data.reviewerName || 'A reviewer'} accepted the invitation to review "${paperTitle(context)}".`
			: `${data.reviewerName || 'A reviewer'} accepted the invitation to review "${paperTitle(context)}".`;
	return emailPayload('Review Invitation Accepted', content);
});

registerEventNotificationTemplate('review.invitation.declined', (context) => {
	const data = metadata(context);
	const role = roleFor(context);

	if (role === 'reviewer') {
		return notificationPayload(
			context,
			'Review Invitation Declined',
			`You declined the invitation to review "${paperTitle(context)}".`,
			'low',
			'reviewer_declined_review'
		);
	}

	if (role === 'author') {
		return notificationPayload(
			context,
			'Reviewer Declined',
			`${data.reviewerName || 'A reviewer'} declined the invitation to review "${paperTitle(context)}".`,
			'medium',
			'reviewer_declined_review'
		);
	}

	return notificationPayload(
		context,
		'Reviewer Declined Paper Review',
		`${data.reviewerName || 'A reviewer'} declined the invitation to review "${paperTitle(context)}".`,
		'low',
		'reviewer_declined_review'
	);
});

registerEventEmailTemplate('review.invitation.declined', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `You declined the invitation to review "${paperTitle(context)}".`
			: role === 'author'
				? `${data.reviewerName || 'A reviewer'} declined the invitation to review "${paperTitle(context)}".`
			: `${data.reviewerName || 'A reviewer'} declined the invitation to review "${paperTitle(context)}".`;
	return emailPayload('Review Invitation Declined', content);
});

registerEventNotificationTemplate('review.invitation.expired', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `Your invitation to review "${paperTitle(context)}" expired.`
			: `${data.reviewerName || 'The reviewer'} did not respond to the invitation for "${paperTitle(context)}" before it expired.`;

	return notificationPayload(context, 'Review Invitation Expired', content, 'high');
});

registerEventEmailTemplate('review.invitation.expired', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `Your invitation to review "${paperTitle(context)}" expired.`
			: `${data.reviewerName || 'The reviewer'} did not respond to the invitation for "${paperTitle(context)}" before it expired.`;

	return emailPayload('Review Invitation Expired', content);
});

registerEventNotificationTemplate('review.invitation.resent', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const count = Number(data.resendCount || 0);

	if (role === 'reviewer') {
		return notificationPayload(
			context,
			'Review Invitation Resent',
			`You have been invited again to review "${paperTitle(context)}".`,
			'high',
			'review_request'
		);
	}

	return notificationPayload(
		context,
		'Review Invitation Resent',
		`The invitation for "${paperTitle(context)}" was resent to ${data.reviewerName || 'the reviewer'} (${count}/2).`,
		'medium'
	);
});

registerEventEmailTemplate('review.invitation.resent', (context) => {
	const data = metadata(context);
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `You have been invited again to review "${paperTitle(context)}".`
			: `The invitation for "${paperTitle(context)}" was resent to ${data.reviewerName || 'the reviewer'}.`;
	return emailPayload('Review Invitation Resent', content);
});

registerEventNotificationTemplate('review.invitation.cancelled', (context) => {
	const role = roleFor(context);
	const title = role === 'reviewer' ? 'Review Invitation Cancelled' : 'Review Invitation Cancelled';
	const content =
		role === 'reviewer'
			? `Your invitation to review "${paperTitle(context)}" has been cancelled.`
			: role === 'author'
				? `A review invitation for "${paperTitle(context)}" has been cancelled.`
			: `The review invitation for "${paperTitle(context)}" has been cancelled.`;

	return notificationPayload(context, title, content, 'low', 'invitation_cancelled');
});

registerEventEmailTemplate('review.invitation.cancelled', (context) => {
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `Your invitation to review "${paperTitle(context)}" has been cancelled.`
			: role === 'author'
				? `A review invitation for "${paperTitle(context)}" has been cancelled.`
			: `The review invitation for "${paperTitle(context)}" has been cancelled.`;
	return emailPayload('Review Invitation Cancelled', content);
});

registerEventNotificationTemplate('review.invitation.duplicate', (context) => {
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `A duplicate review invitation attempt was recorded for "${paperTitle(context)}". Your original invitation remains the active one.`
			: `${metadata(context).reviewerName || 'This reviewer'} already has an active invitation for "${paperTitle(context)}".`;

	return notificationPayload(context, 'Duplicate Review Invitation', content, 'low');
});

registerEventEmailTemplate('review.invitation.duplicate', (context) => {
	const role = roleFor(context);
	const content =
		role === 'reviewer'
			? `A duplicate review invitation attempt was recorded for "${paperTitle(context)}". Your original invitation remains the active one.`
			: `${metadata(context).reviewerName || 'This reviewer'} already has an active invitation for "${paperTitle(context)}".`;

	return emailPayload('Duplicate Review Invitation', content);
});
