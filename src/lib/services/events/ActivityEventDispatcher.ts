import ActivityEvent from '$lib/db/models/ActivityEvent';
import type {
	EventDispatcher,
	EventDispatcherContext,
	EventDispatchResult
} from '$lib/types/EventService';

function isDuplicateKeyError(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		Number((error as { code?: number }).code) === 11000
	);
}

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
			idempotencyKey: recipient.idempotencyKey,
			eventKey: recipient.eventKey,
			metadata: {
				...event.metadata,
				eventKey: recipient.eventKey,
				idempotencyKey: recipient.idempotencyKey
			},
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

		const results: EventDispatchResult[] = [];

		for (let index = 0; index < docs.length; index += 1) {
			const recipient = activeRecipients[index];
			try {
				const createdEvent = await ActivityEvent.create(docs[index]);
				results.push({
					channel: this.channel,
					status: 'sent',
					recipientId: recipient.userId,
					record: createdEvent
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

		return [
			...results,
			...skippedRecipients.map((recipient) => ({
				channel: this.channel,
				status: 'skipped' as const,
				recipientId: recipient.userId,
				reason: 'recipient_channel_disabled'
			}))
		];
	}
}
