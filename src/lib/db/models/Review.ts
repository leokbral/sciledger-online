import mongoose from 'mongoose';
import { ReviewSchema } from '../schemas/ReviewSchema';
import type { Review } from '$lib/types/Review';

// Interface para o modelo Review
export interface IReview extends Review, Document { }

// Criação do modelo Mongoose (com verificação para evitar recompilação em HMR)
const ReviewModel = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export default ReviewModel;
