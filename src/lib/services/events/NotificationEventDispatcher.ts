import { NotificationService } from '$lib/services/NotificationService';
import type {
	EventDispatcher,
	EventDispatcherContext,
	EventDispatchResult
} from '$lib/types/EventService';
import { getEventNotificationTemplate } from './templates';

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

			await NotificationService.createNotification({
				...payload,
				user: recipient.userId,
				relatedUser: payload.relatedUser ?? event.actorId ?? undefined,
				metadata: {
					...(payload.metadata ?? {}),
					eventType: event.type,
					entityType: event.entityType,
					entityId: event.entityId
				}
			});

			results.push({
				channel: this.channel,
				status: 'sent',
				recipientId: recipient.userId
			});
		}

		return results;
	}
}
