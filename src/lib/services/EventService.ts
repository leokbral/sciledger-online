import { start_mongo } from '$lib/db/mongooseConnection';
import type {
	EmitEventInput,
	EmitEventResult,
	EventChannel,
	EventDispatcher,
	EventDispatchResult,
	EventRecipient,
	NormalizedEvent,
	NormalizedEventRecipient
} from '$lib/types/EventService';
import { ActivityEventDispatcher } from './events/ActivityEventDispatcher';
import { EmailEventDispatcher } from './events/EmailEventDispatcher';
import { NotificationEventDispatcher } from './events/NotificationEventDispatcher';
import './events/editorialEventTemplates';
import './events/reviewInvitationTemplates';
export { registerEventEmailTemplate, registerEventNotificationTemplate } from './events/templates';

const DEFAULT_CHANNELS: EventChannel[] = ['activity', 'notification', 'email'];

function normalizeChannels(channels?: EventChannel[]): EventChannel[] {
	if (!channels || channels.length === 0) {
		return [...DEFAULT_CHANNELS];
	}

	return [...new Set(channels)];
}

function normalizeRecipient(
	recipient: EventRecipient,
	defaultChannels: EventChannel[]
): NormalizedEventRecipient | null {
	if (typeof recipient === 'string') {
		const userId = recipient.trim();
		return userId ? { userId, channels: defaultChannels } : null;
	}

	const userId = recipient.userId.trim();
	if (!userId) {
		return null;
	}

	return {
		userId,
		channels: normalizeChannels(recipient.channels ?? defaultChannels)
	};
}

function normalizeEvent(input: EmitEventInput): NormalizedEvent {
	const channels = normalizeChannels(input.channels);
	const recipientsById = new Map<string, NormalizedEventRecipient>();

	for (const recipient of input.recipients) {
		const normalized = normalizeRecipient(recipient, channels);
		if (!normalized) {
			continue;
		}

		const existing = recipientsById.get(normalized.userId);
		recipientsById.set(normalized.userId, {
			userId: normalized.userId,
			channels: normalizeChannels([...(existing?.channels ?? []), ...normalized.channels])
		});
	}

	return {
		type: input.type,
		actorId: input.actorId ?? null,
		recipients: [...recipientsById.values()],
		entityType: input.entityType,
		entityId: input.entityId,
		metadata: input.metadata ?? {},
		channels
	};
}

export class EventService {
	private static dispatchers: EventDispatcher[] = [
		new ActivityEventDispatcher(),
		new NotificationEventDispatcher(),
		new EmailEventDispatcher()
	];

	static setDispatchers(dispatchers: EventDispatcher[]) {
		this.dispatchers = dispatchers;
	}

	static getDispatchers() {
		return this.dispatchers;
	}

	static async emitEvent(input: EmitEventInput): Promise<EmitEventResult> {
		await start_mongo();

		const event = normalizeEvent(input);
		const dispatchResults: EventDispatchResult[] = [];

		for (const dispatcher of this.dispatchers) {
			if (!event.channels.includes(dispatcher.channel)) {
				dispatchResults.push({
					channel: dispatcher.channel,
					status: 'skipped',
					reason: 'event_channel_disabled'
				});
				continue;
			}

			try {
				dispatchResults.push(...(await dispatcher.dispatch({ event })));
			} catch (error) {
				dispatchResults.push({
					channel: dispatcher.channel,
					status: 'failed',
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}

		const activityEvents = dispatchResults
			.filter((result) => result.channel === 'activity' && result.status === 'sent')
			.map((result) => result.record)
			.filter(Boolean);

		return {
			event,
			activityEvents,
			dispatchResults
		};
	}
}

export const emitEvent = EventService.emitEvent.bind(EventService);
