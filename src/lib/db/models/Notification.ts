import mongoose from 'mongoose';
import { NotificationSchema } from '../schemas/tempschema/NotificationSchema';

export interface INotification extends Notification, mongoose.Document {}

const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
export default NotificationModel;
