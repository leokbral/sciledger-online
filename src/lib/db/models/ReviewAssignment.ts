import mongoose from 'mongoose';
import type { ReviewAssignment as ReviewAssignmentType } from '$lib/types/ReviewAssigment';
import { ReviewAssignmentSchema } from '../schemas/ReviewAssignmentSchema';

export type IReviewAssignment = ReviewAssignmentType & mongoose.Document;

const ReviewAssignmentModel =
	mongoose.models.ReviewAssignment ||
	mongoose.model<IReviewAssignment>('ReviewAssignment', ReviewAssignmentSchema);
export default ReviewAssignmentModel;
