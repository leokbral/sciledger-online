import type {
	EventEmailTemplate,
	EventNotificationTemplate,
	PlatformEventType
} from '$lib/types/EventService';

const notificationTemplates = new Map<string, EventNotificationTemplate>();
const emailTemplates = new Map<string, EventEmailTemplate>();

export function registerEventNotificationTemplate(
	type: PlatformEventType,
	template: EventNotificationTemplate
) {
	notificationTemplates.set(type, template);
}

export function registerEventEmailTemplate(type: PlatformEventType, template: EventEmailTemplate) {
	emailTemplates.set(type, template);
}

export function getEventNotificationTemplate(type: PlatformEventType) {
	return notificationTemplates.get(type);
}

export function getEventEmailTemplate(type: PlatformEventType) {
	return emailTemplates.get(type);
}

export function clearEventTemplates() {
	notificationTemplates.clear();
	emailTemplates.clear();
}
