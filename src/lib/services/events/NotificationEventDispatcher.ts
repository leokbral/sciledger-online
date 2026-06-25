import { NotificationService } from '$lib/services/NotificationService';
import type {
	EventDispatcher,
	EventDispatcherContext,
	EventDispatchResult
} from '$lib/types/EventService';
import { getEventNotificationTemplate } from './templates';

function isDuplicateKeyError(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		Number((error as { code?: number }).code) === 11000
	);
}

export class NotificationEventDispatcher implements EventDispatcher {
	readonly channel = 'notification' as const;

	async dispatch({ event }: EventDispatcherContext): Promise<EventDispatchResult[]> {
		const template = getEventNotificationTemplate(event.type);
		if (!template) {
			return [
				{
					channel: this.channel,
					status: 'skipped',
					reason: 'no_notification_template'
				}
			];
		}

		const results: EventDispatchResult[] = [];

		for (const recipient of event.recipients) {
			if (!recipient.channels.includes(this.channel)) {
				results.push({
					channel: this.channel,
					status: 'skipped',
					recipientId: recipient.userId,
					reason: 'recipient_channel_disabled'
				});
				continue;
			}

			const payload = await template({ event, recipient });
			if (!payload) {
				results.push({
					channel: this.channel,
					status: 'skipped',
					recipientId: recipient.userId,
					reason: 'template_returned_empty'
				});
				continue;
			}

			try {
				await NotificationService.createNotification({
					...payload,
					user: recipient.userId,
					relatedUser: payload.relatedUser ?? event.actorId ?? undefined,
					idempotencyKey: recipient.idempotencyKey,
					eventKey: recipient.eventKey,
					metadata: {
						...(payload.metadata ?? {}),
						eventType: event.type,
						entityType: event.entityType,
						entityId: event.entityId,
						eventKey: recipient.eventKey,
						idempotencyKey: recipient.idempotencyKey
					}
				});

				results.push({
					channel: this.channel,
					status: 'sent',
					recipientId: recipient.userId
				});
			} catch (error) {
				if (isDuplicateKeyError(error)) {
					results.push({
						channel: this.channel,
						status: 'skipped',
						recipientId: recipient.userId,
						reason: 'duplicate_event_key'
					});
					continue;
				}

				results.push({
					channel: this.channel,
					status: 'failed',
					recipientId: recipient.userId,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}

		return results;
	}
}
