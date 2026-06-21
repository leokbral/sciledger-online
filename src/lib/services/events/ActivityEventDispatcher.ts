import ActivityEvent from '$lib/db/models/ActivityEvent';
import type {
	EventDispatcher,
	EventDispatcherContext,
	EventDispatchResult
} from '$lib/types/EventService';

export class ActivityEventDispatcher implements EventDispatcher {
	readonly channel = 'activity' as const;

	async dispatch({ event }: EventDispatcherContext): Promise<EventDispatchResult[]> {
		const activeRecipients = event.recipients.filter((recipient) =>
			recipient.channels.includes(this.channel)
		);
		const skippedRecipients = event.recipients.filter(
			(recipient) => !recipient.channels.includes(this.channel)
		);
		const docs = activeRecipients.map((recipient) => ({
			type: event.type,
			actorId: event.actorId,
			targetUserId: recipient.userId,
			entityType: event.entityType,
			entityId: event.entityId,
			metadata: event.metadata,
			createdAt: new Date()
		}));

		if (docs.length === 0) {
			return event.recipients.length
				? event.recipients.map((recipient) => ({
						channel: this.channel,
						status: 'skipped',
						recipientId: recipient.userId,
						reason: 'recipient_channel_disabled'
					}))
				: [
						{
							channel: this.channel,
							status: 'skipped',
							reason: 'no_recipients'
						}
					];
		}

		const createdEvents = await ActivityEvent.insertMany(docs, { ordered: false });

		return [
			...activeRecipients.map((recipient, index) => ({
				channel: this.channel,
				status: 'sent' as const,
				recipientId: recipient.userId,
				record: createdEvents[index]
			})),
			...skippedRecipients.map((recipient) => ({
				channel: this.channel,
				status: 'skipped' as const,
				recipientId: recipient.userId,
				reason: 'recipient_channel_disabled'
			}))
		];
	}
}
