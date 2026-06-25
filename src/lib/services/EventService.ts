import { start_mongo } from '$lib/db/mongooseConnection';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
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
import { createHash } from 'crypto';
import { ActivityEventDispatcher } from './events/ActivityEventDispatcher';
import { EmailEventDispatcher } from './events/EmailEventDispatcher';
import { NotificationEventDispatcher } from './events/NotificationEventDispatcher';
import './events/editorialEventTemplates';
import './events/reviewInvitationTemplates';
export { registerEventEmailTemplate, registerEventNotificationTemplate } from './events/templates';

const DEFAULT_CHANNELS: EventChannel[] = ['activity', 'notification', 'email'];
const IDEMPOTENCY_METADATA_KEYS = [
	'eventId',
	'stripeEventId',
	'stripePaymentIntentId',
	'paymentIntentId',
	'paymentId',
	'chargeId',
	'refundId',
	'transferId',
	'inviteId',
	'emailInvitationId',
	'reviewId',
	'reviewAssignmentId',
	'action',
	'acceptanceType',
	'publicationMode',
	'correctionReason',
	'reviewRound',
	'deadline',
	'previousDeadline',
	'reminderType',
	'daysRemaining',
	'resendCount',
	'parentInvitationId'
] as const;

function normalizeChannels(channels?: EventChannel[]): EventChannel[] {
	if (!channels || channels.length === 0) {
		return [...DEFAULT_CHANNELS];
	}

	const normalized = [...new Set(channels)];
	if (
		(normalized.includes('notification') || normalized.includes('email')) &&
		!normalized.includes('activity')
	) {
		return ['activity', ...normalized];
	}

	return normalized;
}

function normalizeRecipient(
	recipient: EventRecipient,
	defaultChannels: EventChannel[]
): Pick<NormalizedEventRecipient, 'userId' | 'channels'> | null {
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

function stableValue(value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return '';
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return `[${value.map(stableValue).sort().join(',')}]`;
	}

	if (typeof value === 'object') {
		return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
	}

	return String(value);
}

function hashKey(prefix: string, value: string) {
	return `${prefix}_${createHash('sha256').update(value).digest('hex')}`;
}

function buildIdempotencySource(input: EmitEventInput) {
	const metadata = input.metadata ?? {};
	const explicitKey = input.idempotencyKey ?? metadata.idempotencyKey ?? metadata.eventKey;
	if (explicitKey) {
		return stableValue(explicitKey);
	}

	const parts = [
		`type:${input.type}`,
		`entityType:${input.entityType}`,
		`entityId:${input.entityId}`
	];

	for (const key of IDEMPOTENCY_METADATA_KEYS) {
		const value = metadata[key];
		const stable = stableValue(value);
		if (stable) {
			parts.push(`${key}:${stable}`);
		}
	}

	return parts.join('|');
}

export function buildEventIdempotencyKey(input: EmitEventInput) {
	return hashKey('idem', buildIdempotencySource(input));
}

export function buildRecipientEventKey(idempotencyKey: string, recipientId: string) {
	return hashKey('event', `${idempotencyKey}|recipient:${recipientId}`);
}

async function normalizeEvent(input: EmitEventInput): Promise<NormalizedEvent> {
	const channels = normalizeChannels(input.channels);
	const recipientsById = new Map<string, NormalizedEventRecipient>();
	const idempotencyKey = buildEventIdempotencyKey(input);
	const actorResolution = input.actorId ? await resolveUserIdentifiers(input.actorId) : null;

	for (const recipient of input.recipients) {
		const normalized = normalizeRecipient(recipient, channels);
		if (!normalized) {
			continue;
		}

		const recipientResolution = await resolveUserIdentifiers(normalized.userId);
		const userId = recipientResolution.canonicalId || normalized.userId;
		const existing = recipientsById.get(userId);
		recipientsById.set(userId, {
			userId,
			channels: normalizeChannels([...(existing?.channels ?? []), ...normalized.channels]),
			idempotencyKey,
			eventKey: buildRecipientEventKey(idempotencyKey, userId)
		});
	}

	return {
		type: input.type,
		actorId: actorResolution?.canonicalId ?? input.actorId ?? null,
		recipients: [...recipientsById.values()],
		entityType: input.entityType,
		entityId: input.entityId,
		idempotencyKey,
		metadata: {
			...(input.metadata ?? {}),
			idempotencyKey
		},
		channels
	};
}

function eventWithRecipients(
	event: NormalizedEvent,
	recipients: NormalizedEventRecipient[]
): NormalizedEvent {
	return {
		...event,
		recipients
	};
}

function sideEffectSkipResults(
	channel: EventChannel,
	recipients: NormalizedEventRecipient[],
	reason: string
): EventDispatchResult[] {
	return recipients.map((recipient) => ({
		channel,
		status: 'skipped' as const,
		recipientId: recipient.userId,
		reason
	}));
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

		const event = await normalizeEvent(input);
		const dispatchResults: EventDispatchResult[] = [];
		let recipientsAllowedForSideEffects: Set<string> | null = null;

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
				if (dispatcher.channel === 'activity') {
					const activityResults = await dispatcher.dispatch({ event });
					dispatchResults.push(...activityResults);
					recipientsAllowedForSideEffects = new Set(
						activityResults
							.filter((result) => result.status === 'sent' && result.recipientId)
							.map((result) => String(result.recipientId))
					);
					continue;
				}

				const allowedRecipientIds = recipientsAllowedForSideEffects;
				const recipientsForDispatcher = allowedRecipientIds
					? event.recipients.filter(
							(recipient) =>
								!recipient.channels.includes('activity') ||
								allowedRecipientIds.has(recipient.userId)
						)
					: event.recipients;

				const skippedRecipients = allowedRecipientIds
					? event.recipients.filter(
							(recipient) =>
								recipient.channels.includes(dispatcher.channel) &&
								recipient.channels.includes('activity') &&
								!allowedRecipientIds.has(recipient.userId)
						)
					: [];

				dispatchResults.push(
					...sideEffectSkipResults(
						dispatcher.channel,
						skippedRecipients,
						'duplicate_event_key'
					)
				);

				if (recipientsForDispatcher.length === 0) {
					continue;
				}

				dispatchResults.push(
					...(await dispatcher.dispatch({
						event: eventWithRecipients(event, recipientsForDispatcher)
					}))
				);
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
