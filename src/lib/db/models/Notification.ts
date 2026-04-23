import mongoose from 'mongoose';
import { NotificationSchema } from '../schemas/NotificationSchema';
import type { Notification } from '$lib/types/Notification';

export interface INotification extends Omit<Notification, '_id'> {
	map(arg0: (n: Notification) => Notification): import("../../types/Notification").Notification[];
}

import type { Document } from 'mongoose';

const cachedNotificationModel = mongoose.models.Notification as
	| mongoose.Model<INotification & Document>
	| undefined;

if (cachedNotificationModel) {
	const typePath = cachedNotificationModel.schema.path('type') as { enumValues?: string[] } | undefined;
	const enumValues = Array.isArray(typePath?.enumValues) ? typePath.enumValues : [];
	const isOutdatedSchema =
		!cachedNotificationModel.schema.path('title') ||
		!cachedNotificationModel.schema.path('actionUrl') ||
		!enumValues.includes('hub_invitation') ||
		!enumValues.includes('review_request') ||
		!enumValues.includes('hub_reviewer_accepted');

	if (isOutdatedSchema) {
		mongoose.deleteModel('Notification');
	}
}

const NotificationModel =
	mongoose.models.Notification ||
	mongoose.model<INotification & Document>('Notification', NotificationSchema);
export default NotificationModel;
