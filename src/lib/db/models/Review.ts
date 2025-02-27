import mongoose from 'mongoose';
import { ReviewSchema } from '../schemas/ReviewSchema';
import type { Review } from '$lib/types/Review';

// Interface para o modelo Review
export interface IReview extends Review, Document { }

// Criação do modelo Mongoose
const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema);
export default ReviewModel;
