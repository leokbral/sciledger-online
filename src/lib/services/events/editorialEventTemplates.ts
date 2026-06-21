import type {
	EventEmailPayload,
	EventNotificationPayload,
	EventTemplateContext
} from '$lib/types/EventService';
import { registerEventEmailTemplate, registerEventNotificationTemplate } from './templates';

type EditorialMetadata = {
	paperId?: string;
	paperTitle?: string;
	hubId?: string | null;
	hubName?: string | null;
	reviewId?: string;
	reviewerName?: string;
	editorName?: string;
	actorName?: string;
	targetUserName?: string;
	inviteeName?: string;
	inviterName?: string;
	roleKey?: string;
	roleName?: string;
	deadline?: string;
	previousDeadline?: string;
	reminderType?: string;
	daysRemaining?: number;
	amount?: number;
	currency?: string;
	paymentStatus?: string;
	failureReason?: string;
	reason?: string;
	acceptanceType?: string;
	decision?: string;
	finalDecision?: string;
	rejectionReason?: string;
	correctionReason?: string;
	reviewDecision?: string;
	recipientRoles?: Record<string, string>;
};

function metadata(context: EventTemplateContext): EditorialMetadata {
	return context.event.metadata as EditorialMetadata;
}

function roleFor(context: EventTemplateContext) {
	return metadata(context).recipientRoles?.[context.recipient.userId] || 'recipient';
}

function paperTitle(context: EventTemplateContext) {
	return metadata(context).paperTitle || 'the paper';
}

function actionUrl(context: EventTemplateContext) {
	const data = metadata(context);
	const paperId = data.paperId || context.event.entityId;

	if (context.event.type.startsWith('hub.')) {
		return `/hub/view/${data.hubId || context.event.entityId}`;
	}

	if (context.event.type.startsWith('role.')) {
		return data.hubId ? `/hub/view/${data.hubId}/rbac` : '/notifications';
	}

	if (context.event.type.startsWith('payment.') || context.event.type === 'reviewer.payout.paid') {
		return data.paperId ? `/publish/view/${data.paperId}` : '/notifications';
	}

	if (
		context.event.type === 'review.assignment.deadline_updated' ||
		context.event.type === 'review.deadline.reminder' ||
		context.event.type === 'review.deadline.overdue' ||
		context.event.type === 'review.assignment.removed'
	) {
		return data.paperId ? `/review/inreview/${data.paperId}` : '/notifications';
	}

	if (context.event.type === 'paper.final_review_submitted') {
		return data.paperId ? `/review/inreview/${data.paperId}` : '/notifications';
	}

	if (context.event.type === 'paper.publication_requested') {
		return data.paperId ? `/publish/publication-approval/${data.paperId}` : '/notifications';
	}

	if (context.event.type === 'paper.withdrawn') {
		return data.paperId ? `/publish/view/${data.paperId}` : '/notifications';
	}

	if (context.event.type === 'paper.created') {
		return data.paperId ? `/publish/edit/${data.paperId}` : '/notifications';
	}

	if (context.event.type === 'paper.published') {
		return `/publish/published/${paperId}`;
	}

	if (
		context.event.type === 'paper.correction_requested' ||
		context.event.type === 'paper.corrections_submitted' ||
		context.event.type === 'paper.correction_deadline.updated'
	) {
		return `/publish/corrections/${paperId}`;
	}

	if (context.event.type === 'review.submitted') {
		return roleFor(context) === 'editor'
			? `/review/inreview/${paperId}`
			: `/publish/corrections/${paperId}`;
	}

	return `/publish/view/${paperId}`;
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
		relatedReviewId: data.reviewId,
		actionUrl: actionUrl(context),
		priority,
		metadata: context.event.metadata
	};
}

function emailPayload(title: string, content: string): EventEmailPayload {
	return {
		subject: title,
		text: `${content}\n\nOpen SciLedger to view the latest details.`,
		html: `<p>${escapeHtml(content)}</p><p>Open SciLedger to view the latest details.</p>`
	};
}

function reviewDecisionLabel(value?: string) {
	const labels: Record<string, string> = {
		accept: 'recommended acceptance',
		accept_without_changes: 'recommended acceptance',
		accept_with_minor_revisions: 'requested minor revisions',
		minor_revision: 'requested minor revisions',
		major_revision: 'requested major revisions',
		reject: 'recommended rejection'
	};

	return labels[String(value || '')] || 'submitted a recommendation';
}

registerEventNotificationTemplate('paper.created', (context) =>
	notificationPayload(
		context,
		'Paper Draft Created',
		`Your draft "${paperTitle(context)}" was created.`,
		'low',
		'paper_submitted'
	)
);

registerEventEmailTemplate('paper.created', (context) =>
	emailPayload('Paper Draft Created', `Your draft "${paperTitle(context)}" was created.`)
);

registerEventNotificationTemplate('paper.submitted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);

	if (role === 'editor') {
		return notificationPayload(
			context,
			'New Paper Submitted',
			`New paper "${paperTitle(context)}" submitted for review.`,
			'high',
			data.hubId ? 'hub_paper_pending' : 'standalone_paper_pending'
		);
	}

	return notificationPayload(
		context,
		'Paper Submitted',
		`Your paper "${paperTitle(context)}" was submitted successfully.`,
		'medium',
		'paper_submitted'
	);
});

registerEventEmailTemplate('paper.submitted', (context) => {
	const role = roleFor(context);
	const content =
		role === 'editor'
			? `New paper "${paperTitle(context)}" was submitted for review.`
			: `Your paper "${paperTitle(context)}" was submitted successfully.`;

	return emailPayload(role === 'editor' ? 'New Paper Submitted' : 'Paper Submitted', content);
});

registerEventNotificationTemplate('paper.accepted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const acceptedBy = data.actorName || data.editorName || 'an editor';

	if (data.acceptanceType === 'review') {
		if (role === 'reviewer') {
			return notificationPayload(
				context,
				'New Paper for Review',
				`You have been assigned to review "${paperTitle(context)}".`,
				'high',
				'reviewer_assigned'
			);
		}

		return notificationPayload(
			context,
			'Paper Accepted for Review',
			`Your paper "${paperTitle(context)}" has been accepted for review by ${acceptedBy}.`,
			'high',
			'paper_accepted_for_review'
		);
	}

	if (role === 'reviewer') {
		return notificationPayload(
			context,
			'Final Decision on Paper',
			`The paper "${paperTitle(context)}" you reviewed has been accepted.`,
			'low',
			'paper_final_acceptance'
		);
	}

	return notificationPayload(
		context,
		'Paper Accepted',
		`Your paper "${paperTitle(context)}" was accepted.`,
		'high',
		'paper_final_acceptance'
	);
});

registerEventEmailTemplate('paper.accepted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const content =
		data.acceptanceType === 'review'
			? role === 'reviewer'
				? `You have been assigned to review "${paperTitle(context)}".`
				: `Your paper "${paperTitle(context)}" has been accepted for review.`
			: role === 'reviewer'
				? `The paper "${paperTitle(context)}" you reviewed has been accepted.`
				: `Your paper "${paperTitle(context)}" was accepted.`;

	return emailPayload(
		data.acceptanceType === 'review' ? 'Paper Accepted for Review' : 'Paper Accepted',
		content
	);
});

registerEventNotificationTemplate('paper.rejected', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const isFinal = data.finalDecision === 'reject' || data.decision === 'reject';
	const reason = data.rejectionReason ? ` Reason: ${data.rejectionReason}` : '';

	if (role === 'reviewer') {
		return notificationPayload(
			context,
			'Final Decision on Paper',
			`The paper "${paperTitle(context)}" you reviewed was rejected.`,
			'low',
			'paper_final_rejection'
		);
	}

	return notificationPayload(
		context,
		isFinal ? 'Final Decision on Paper' : 'Paper Rejected',
		`Your paper "${paperTitle(context)}" was rejected.${reason}`,
		'high',
		isFinal ? 'paper_final_rejection' : 'paper_rejected'
	);
});

registerEventEmailTemplate('paper.rejected', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const reason = data.rejectionReason ? ` Reason: ${data.rejectionReason}` : '';
	return emailPayload(
		data.finalDecision === 'reject' || data.decision === 'reject'
			? 'Final Decision on Paper'
			: 'Paper Rejected',
		role === 'reviewer'
			? `The paper "${paperTitle(context)}" you reviewed was rejected.`
			: `Your paper "${paperTitle(context)}" was rejected.${reason}`
	);
});

registerEventNotificationTemplate('paper.correction_requested', (context) => {
	const data = metadata(context);
	const publicationRejected = data.correctionReason === 'publication_rejected';

	return notificationPayload(
		context,
		publicationRejected ? 'Publication Corrections Requested' : 'Corrections Requested',
		publicationRejected
			? `Publication for "${paperTitle(context)}" was not approved. Further corrections are requested.`
			: `Corrections were requested for "${paperTitle(context)}".`,
		'high',
		'system'
	);
});

registerEventEmailTemplate('paper.correction_requested', (context) => {
	const data = metadata(context);
	const publicationRejected = data.correctionReason === 'publication_rejected';
	return emailPayload(
		publicationRejected ? 'Publication Corrections Requested' : 'Corrections Requested',
		publicationRejected
			? `Publication for "${paperTitle(context)}" was not approved. Further corrections are requested.`
			: `Corrections were requested for "${paperTitle(context)}".`
	);
});

registerEventNotificationTemplate('paper.published', (context) =>
	notificationPayload(
		context,
		'Paper Published',
		`Your paper "${paperTitle(context)}" has been published.`,
		'high',
		'paper_published'
	)
);

registerEventEmailTemplate('paper.published', (context) =>
	emailPayload('Paper Published', `Your paper "${paperTitle(context)}" has been published.`)
);

registerEventNotificationTemplate('review.submitted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const reviewerName = data.reviewerName || 'A reviewer';
	const decision = reviewDecisionLabel(data.reviewDecision);

	if (role === 'author') {
		return notificationPayload(
			context,
			'Review Received',
			`Your paper "${paperTitle(context)}" has been reviewed. The reviewer ${decision}.`,
			'high',
			'review_submitted'
		);
	}

	return notificationPayload(
		context,
		'Review Completed',
		`${reviewerName} completed a review for "${paperTitle(context)}" and ${decision}.`,
		'high',
		'review_submitted'
	);
});

registerEventEmailTemplate('review.submitted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const reviewerName = data.reviewerName || 'A reviewer';
	const decision = reviewDecisionLabel(data.reviewDecision);
	const content =
		role === 'author'
			? `Your paper "${paperTitle(context)}" has been reviewed. The reviewer ${decision}.`
			: `${reviewerName} completed a review for "${paperTitle(context)}" and ${decision}.`;

	return emailPayload(role === 'author' ? 'Review Received' : 'Review Completed', content);
});

function amountLabel(data: EditorialMetadata) {
	const amount = Number(data.amount || 0);
	const currency = String(data.currency || 'BRL').toUpperCase();
	if (!amount) return 'the payment';
	return `${currency} ${(amount / 100).toFixed(2)}`;
}

registerEventNotificationTemplate('paper.corrections_submitted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const authorName = data.actorName || 'The author';
	const requiresNewReview = data.correctionReason === 'new_review_required';

	if (role === 'author') {
		return notificationPayload(
			context,
			'Corrections Submitted',
			`Your corrections for "${paperTitle(context)}" were submitted successfully.`,
			'medium',
			'corrections_submitted'
		);
	}

	return notificationPayload(
		context,
		requiresNewReview ? 'New Version for Review' : 'Corrections Submitted',
		`${authorName} submitted corrections for "${paperTitle(context)}".`,
		'high',
		'corrections_submitted'
	);
});

registerEventEmailTemplate('paper.corrections_submitted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const content =
		role === 'author'
			? `Your corrections for "${paperTitle(context)}" were submitted successfully.`
			: `${data.actorName || 'The author'} submitted corrections for "${paperTitle(context)}".`;
	return emailPayload('Corrections Submitted', content);
});

registerEventNotificationTemplate('paper.final_review_submitted', (context) =>
	notificationPayload(
		context,
		'Final Review Version Submitted',
		`A corrected final review version of "${paperTitle(context)}" was submitted.`,
		'high',
		'corrections_submitted'
	)
);

registerEventEmailTemplate('paper.final_review_submitted', (context) =>
	emailPayload(
		'Final Review Version Submitted',
		`A corrected final review version of "${paperTitle(context)}" was submitted.`
	)
);

registerEventNotificationTemplate('paper.publication_requested', (context) =>
	notificationPayload(
		context,
		'Publication Approval Requested',
		`Publication approval was requested for "${paperTitle(context)}".`,
		'high',
		'hub_paper_pending'
	)
);

registerEventEmailTemplate('paper.publication_requested', (context) =>
	emailPayload(
		'Publication Approval Requested',
		`Publication approval was requested for "${paperTitle(context)}".`
	)
);

registerEventNotificationTemplate('paper.withdrawn', (context) => {
	const role = roleFor(context);
	return notificationPayload(
		context,
		'Paper Withdrawn',
		role === 'author'
			? `You withdrew "${paperTitle(context)}".`
			: `"${paperTitle(context)}" was withdrawn.`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('paper.withdrawn', (context) =>
	emailPayload('Paper Withdrawn', `"${paperTitle(context)}" was withdrawn.`)
);

registerEventNotificationTemplate('paper.correction_deadline.updated', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Correction Deadline Updated',
		`The correction deadline for "${paperTitle(context)}" was updated${data.deadline ? ` to ${data.deadline}` : ''}.`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('paper.correction_deadline.updated', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Correction Deadline Updated',
		`The correction deadline for "${paperTitle(context)}" was updated${data.deadline ? ` to ${data.deadline}` : ''}.`
	);
});

registerEventNotificationTemplate('review.assignment.deadline_updated', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Review Deadline Updated',
		`The review deadline for "${paperTitle(context)}" was updated${data.deadline ? ` to ${data.deadline}` : ''}.`,
		'medium',
		'review_request'
	);
});

registerEventEmailTemplate('review.assignment.deadline_updated', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Review Deadline Updated',
		`The review deadline for "${paperTitle(context)}" was updated${data.deadline ? ` to ${data.deadline}` : ''}.`
	);
});

registerEventNotificationTemplate('review.deadline.reminder', (context) => {
	const data = metadata(context);
	const days = Number(data.daysRemaining || 0);
	return notificationPayload(
		context,
		days <= 1 ? 'Review Due Soon' : 'Review Deadline Reminder',
		`Your review for "${paperTitle(context)}" is due ${days > 0 ? `in ${days} day${days === 1 ? '' : 's'}` : 'soon'}.`,
		days <= 1 ? 'high' : 'medium',
		'review_request'
	);
});

registerEventEmailTemplate('review.deadline.reminder', (context) => {
	const data = metadata(context);
	const days = Number(data.daysRemaining || 0);
	return emailPayload(
		days <= 1 ? 'Review Due Soon' : 'Review Deadline Reminder',
		`Your review for "${paperTitle(context)}" is due ${days > 0 ? `in ${days} day${days === 1 ? '' : 's'}` : 'soon'}.`
	);
});

registerEventNotificationTemplate('review.deadline.overdue', (context) => {
	const role = roleFor(context);
	return notificationPayload(
		context,
		'Review Overdue',
		role === 'editor'
			? `A review for "${paperTitle(context)}" is overdue.`
			: `Your review for "${paperTitle(context)}" is overdue.`,
		'urgent',
		'review_request'
	);
});

registerEventEmailTemplate('review.deadline.overdue', (context) => {
	const role = roleFor(context);
	return emailPayload(
		'Review Overdue',
		role === 'editor'
			? `A review for "${paperTitle(context)}" is overdue.`
			: `Your review for "${paperTitle(context)}" is overdue.`
	);
});

registerEventNotificationTemplate('review.assignment.removed', (context) => {
	const role = roleFor(context);
	return notificationPayload(
		context,
		'Reviewer Removed',
		role === 'reviewer'
			? `You were removed from reviewing "${paperTitle(context)}".`
			: `A reviewer was removed from "${paperTitle(context)}".`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('review.assignment.removed', (context) =>
	emailPayload(
		'Reviewer Removed',
		`A reviewer assignment for "${paperTitle(context)}" was removed.`
	)
);

registerEventNotificationTemplate('role.assigned', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const roleName = data.roleName || data.roleKey || 'a role';
	return notificationPayload(
		context,
		'Role Assigned',
		role === 'target'
			? `You were assigned ${roleName}.`
			: `${data.targetUserName || 'A user'} was assigned ${roleName}.`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('role.assigned', (context) => {
	const data = metadata(context);
	return emailPayload('Role Assigned', `You were assigned ${data.roleName || data.roleKey || 'a role'}.`);
});

registerEventNotificationTemplate('role.revoked', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	const roleName = data.roleName || data.roleKey || 'a role';
	return notificationPayload(
		context,
		'Role Revoked',
		role === 'target'
			? `${roleName} was revoked from your account.`
			: `${roleName} was revoked from ${data.targetUserName || 'a user'}.`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('role.revoked', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Role Revoked',
		`${data.roleName || data.roleKey || 'A role'} was revoked from your account.`
	);
});

registerEventNotificationTemplate('role.created', (context) =>
	notificationPayload(
		context,
		'Role Created',
		`Role "${metadata(context).roleName || metadata(context).roleKey || 'Untitled role'}" was created.`,
		'low',
		'system'
	)
);

registerEventEmailTemplate('role.created', (context) =>
	emailPayload(
		'Role Created',
		`Role "${metadata(context).roleName || metadata(context).roleKey || 'Untitled role'}" was created.`
	)
);

registerEventNotificationTemplate('role.updated', (context) =>
	notificationPayload(
		context,
		'Role Updated',
		`Role "${metadata(context).roleName || metadata(context).roleKey || 'Untitled role'}" was updated.`,
		'low',
		'system'
	)
);

registerEventEmailTemplate('role.updated', (context) =>
	emailPayload(
		'Role Updated',
		`Role "${metadata(context).roleName || metadata(context).roleKey || 'Untitled role'}" was updated.`
	)
);

registerEventNotificationTemplate('hub.created', (context) =>
	notificationPayload(
		context,
		'Hub Created',
		`Hub "${metadata(context).hubName || 'Untitled hub'}" was created.`,
		'medium',
		'system'
	)
);

registerEventEmailTemplate('hub.created', (context) =>
	emailPayload('Hub Created', `Hub "${metadata(context).hubName || 'Untitled hub'}" was created.`)
);

registerEventNotificationTemplate('hub.updated', (context) =>
	notificationPayload(
		context,
		'Hub Updated',
		`Hub "${metadata(context).hubName || 'Untitled hub'}" was updated.`,
		'low',
		'system'
	)
);

registerEventEmailTemplate('hub.updated', (context) =>
	emailPayload('Hub Updated', `Hub "${metadata(context).hubName || 'Untitled hub'}" was updated.`)
);

registerEventNotificationTemplate('hub.invitation.created', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	return notificationPayload(
		context,
		role === 'invitee' ? 'Hub Invitation' : 'Hub Invitation Sent',
		role === 'invitee'
			? `You were invited to join "${data.hubName || 'a hub'}".`
			: `Invitation sent to ${data.inviteeName || 'the invitee'} for "${data.hubName || 'a hub'}".`,
		'medium',
		'hub_invitation'
	);
});

registerEventEmailTemplate('hub.invitation.created', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	return emailPayload(
		role === 'invitee' ? 'Hub Invitation' : 'Hub Invitation Sent',
		role === 'invitee'
			? `You were invited to join "${data.hubName || 'a hub'}".`
			: `Invitation sent to ${data.inviteeName || 'the invitee'} for "${data.hubName || 'a hub'}".`
	);
});

registerEventNotificationTemplate('hub.invitation.accepted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	return notificationPayload(
		context,
		'Hub Invitation Accepted',
		role === 'invitee'
			? `You accepted the invitation to "${data.hubName || 'the hub'}".`
			: `${data.inviteeName || 'A user'} accepted the invitation to "${data.hubName || 'the hub'}".`,
		'medium',
		'hub_reviewer_accepted'
	);
});

registerEventEmailTemplate('hub.invitation.accepted', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	return emailPayload(
		'Hub Invitation Accepted',
		role === 'invitee'
			? `You accepted the invitation to "${data.hubName || 'the hub'}".`
			: `${data.inviteeName || 'A user'} accepted the invitation to "${data.hubName || 'the hub'}".`
	);
});

registerEventNotificationTemplate('hub.invitation.declined', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	return notificationPayload(
		context,
		'Hub Invitation Declined',
		role === 'invitee'
			? `You declined the invitation to "${data.hubName || 'the hub'}".`
			: `${data.inviteeName || 'A user'} declined the invitation to "${data.hubName || 'the hub'}".`,
		'low',
		'hub_reviewer_declined'
	);
});

registerEventEmailTemplate('hub.invitation.declined', (context) => {
	const role = roleFor(context);
	const data = metadata(context);
	return emailPayload(
		'Hub Invitation Declined',
		role === 'invitee'
			? `You declined the invitation to "${data.hubName || 'the hub'}".`
			: `${data.inviteeName || 'A user'} declined the invitation to "${data.hubName || 'the hub'}".`
	);
});

registerEventNotificationTemplate('payment.hold.authorized', (context) =>
	notificationPayload(
		context,
		'Payment Hold Authorized',
		`Payment hold for "${paperTitle(context)}" was authorized.`,
		'medium',
		'system'
	)
);

registerEventEmailTemplate('payment.hold.authorized', (context) =>
	emailPayload('Payment Hold Authorized', `Payment hold for "${paperTitle(context)}" was authorized.`)
);

registerEventNotificationTemplate('payment.hold.captured', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Payment Hold Captured',
		`Payment hold for "${paperTitle(context)}" was captured (${amountLabel(data)}).`,
		'high',
		'system'
	);
});

registerEventEmailTemplate('payment.hold.captured', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Payment Hold Captured',
		`Payment hold for "${paperTitle(context)}" was captured (${amountLabel(data)}).`
	);
});

registerEventNotificationTemplate('payment.hold.failed', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Payment Hold Failed',
		`Payment hold for "${paperTitle(context)}" failed${data.failureReason ? `: ${data.failureReason}` : ''}.`,
		'high',
		'system'
	);
});

registerEventEmailTemplate('payment.hold.failed', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Payment Hold Failed',
		`Payment hold for "${paperTitle(context)}" failed${data.failureReason ? `: ${data.failureReason}` : ''}.`
	);
});

registerEventNotificationTemplate('payment.hold.released', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Payment Hold Released',
		`Payment hold for "${paperTitle(context)}" was released${data.reason ? `: ${data.reason}` : ''}.`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('payment.hold.released', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Payment Hold Released',
		`Payment hold for "${paperTitle(context)}" was released${data.reason ? `: ${data.reason}` : ''}.`
	);
});

registerEventNotificationTemplate('payment.refunded', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Payment Refunded',
		`Payment for "${paperTitle(context)}" was refunded${data.reason ? `: ${data.reason}` : ''}.`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('payment.refunded', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Payment Refunded',
		`Payment for "${paperTitle(context)}" was refunded${data.reason ? `: ${data.reason}` : ''}.`
	);
});

registerEventNotificationTemplate('reviewer.payout.paid', (context) => {
	const data = metadata(context);
	return notificationPayload(
		context,
		'Reviewer Payout Paid',
		`Your reviewer payout for "${paperTitle(context)}" was paid (${amountLabel(data)}).`,
		'medium',
		'system'
	);
});

registerEventEmailTemplate('reviewer.payout.paid', (context) => {
	const data = metadata(context);
	return emailPayload(
		'Reviewer Payout Paid',
		`Your reviewer payout for "${paperTitle(context)}" was paid (${amountLabel(data)}).`
	);
});
