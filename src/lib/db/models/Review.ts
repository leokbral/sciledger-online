import mongoose from 'mongoose';
import { ReviewSchema } from '../schemas/ReviewSchema';
import type { Review } from '$lib/types/Review';

// Interface for the Review model
export interface IReview extends Review, Document { }

// Mongoose model creation (with check to avoid recompilation on HMR)
const ReviewModel = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export default ReviewModel;
