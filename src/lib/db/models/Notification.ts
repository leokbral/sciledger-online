import mongoose from 'mongoose';
import { NotificationSchema } from '../schemas/NotificationSchema';
import type { Notification } from '$lib/types/Notification';

export interface INotification extends Omit<Notification, '_id'> {
	map(arg0: (n: Notification) => Notification): import("../../types/Notification").Notification[];
}

import type { Document } from 'mongoose';

const NotificationModel = mongoose.models.Notification || mongoose.model<INotification & Document>('Notification', NotificationSchema);
export default NotificationModel;
