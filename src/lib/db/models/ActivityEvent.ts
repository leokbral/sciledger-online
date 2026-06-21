import mongoose from 'mongoose';
import { ActivityEventSchema } from '../schemas/ActivityEventSchema';
import type { ActivityEvent } from '$lib/types/ActivityEvent';

export interface IActivityEvent extends Omit<ActivityEvent, '_id'>, mongoose.Document {}

const ActivityEventModel =
	mongoose.models.ActivityEvent ||
	mongoose.model<IActivityEvent>('ActivityEvent', ActivityEventSchema);

export default ActivityEventModel;
