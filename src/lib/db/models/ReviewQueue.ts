import type { ReviewQueue } from '$lib/types/ReviewQueue';
import mongoose from 'mongoose';
import { ReviewQueueSchema } from '../schemas/ReviewQueue';


export interface IReviewQueue extends ReviewQueue {}

const ReviewQueueModel = mongoose.models.ReviewQueue || mongoose.model<IReviewQueue>('ReviewQueue', ReviewQueueSchema);
export default ReviewQueueModel;
