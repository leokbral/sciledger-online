import type { NotificationPriority, NotificationType } from './Notification';

export const platformEventTypes = [
	'paper.created',
	'paper.submitted',
	'paper.accepted',
	'paper.rejected',
	'paper.correction_requested',
	'paper.published',
	'paper.corrections_submitted',
	'paper.final_review_submitted',
	'paper.publication_requested',
	'paper.withdrawn',
	'paper.correction_deadline.updated',
	'review.invitation.created',
	'review.invitation.accepted',
	'review.invitation.declined',
	'review.invitation.expired',
	'review.invitation.resent',
	'review.invitation.cancelled',
	'review.invitation.duplicate',
	'review.submitted',
	'review.assignment.deadline_updated',
	'review.deadline.reminder',
	'review.deadline.overdue',
	'review.assignment.removed',
	'role.assigned',
	'role.revoked',
	'role.created',
	'role.updated',
	'hub.created',
	'hub.updated',
	'hub.invitation.created',
	'hub.invitation.accepted',
	'hub.invitation.declined',
	'payment.hold.authorized',
	'payment.hold.captured',
	'payment.hold.failed',
	'payment.hold.released',
	'payment.refunded',
	'reviewer.payout.paid'
] as const;

export type PlatformEventType = (typeof platformEventTypes)[number] | (string & {});

export type EventEntityType =
	| 'paper'
	| 'review'
	| 'reviewInvitation'
	| 'hub'
	| 'role'
	| 'user'
	| 'system'
	| (string & {});

export type EventChannel = 'activity' | 'notification' | 'email';

export type EventRecipient =
	| string
	| {
			userId: string;
			channels?: EventChannel[];
	  };

export type EmitEventInput = {
	type: PlatformEventType;
	actorId?: string | null;
	recipients: EventRecipient[];
	entityType: EventEntityType;
	entityId: string;
	metadata?: Record<string, unknown>;
	channels?: EventChannel[];
};

export type NormalizedEventRecipient = {
	userId: string;
	channels: EventChannel[];
};

export type NormalizedEvent = {
	type: PlatformEventType;
	actorId: string | null;
	recipients: NormalizedEventRecipient[];
	entityType: EventEntityType;
	entityId: string;
	metadata: Record<string, unknown>;
	channels: EventChannel[];
};

export type EventNotificationPayload = {
	type: NotificationType;
	title: string;
	content: string;
	relatedUser?: string;
	relatedPaperId?: string;
	relatedCommentId?: string;
	relatedHubId?: string;
	relatedReviewId?: string;
	actionUrl?: string;
	metadata?: Record<string, unknown>;
	priority?: NotificationPriority;
	expiresAt?: Date;
};

export type EventEmailPayload = {
	subject: string;
	text: string;
	html?: string;
};

export type EventTemplateContext = {
	event: NormalizedEvent;
	recipient: NormalizedEventRecipient;
};

export type EventNotificationTemplate = (
	context: EventTemplateContext
) =>
	| EventNotificationPayload
	| null
	| undefined
	| Promise<EventNotificationPayload | null | undefined>;

export type EventEmailTemplate = (
	context: EventTemplateContext
) => EventEmailPayload | null | undefined | Promise<EventEmailPayload | null | undefined>;

export type EventDispatchStatus = 'sent' | 'skipped' | 'failed';

export type EventDispatchResult = {
	channel: EventChannel;
	status: EventDispatchStatus;
	recipientId?: string;
	record?: unknown;
	reason?: string;
	error?: string;
};

export type EventDispatcherContext = {
	event: NormalizedEvent;
};

export type EventDispatcher = {
	channel: EventChannel;
	dispatch(context: EventDispatcherContext): Promise<EventDispatchResult[]>;
};

export type EmitEventResult = {
	event: NormalizedEvent;
	activityEvents: unknown[];
	dispatchResults: EventDispatchResult[];
};
