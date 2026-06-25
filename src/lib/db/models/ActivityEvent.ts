import mongoose from 'mongoose';
import { ActivityEventSchema } from '../schemas/ActivityEventSchema';
import type { ActivityEvent } from '$lib/types/ActivityEvent';

export interface IActivityEvent extends Omit<ActivityEvent, '_id'>, mongoose.Document {}

const cachedActivityEventModel = mongoose.models.ActivityEvent as
	| mongoose.Model<IActivityEvent>
	| undefined;

if (
	cachedActivityEventModel &&
	(!cachedActivityEventModel.schema.path('eventKey') ||
		!cachedActivityEventModel.schema.path('idempotencyKey'))
) {
	mongoose.deleteModel('ActivityEvent');
}

const ActivityEventModel =
	mongoose.models.ActivityEvent ||
	mongoose.model<IActivityEvent>('ActivityEvent', ActivityEventSchema);

export default ActivityEventModel;
