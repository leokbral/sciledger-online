import mongoose from 'mongoose';
import type { ReviewAssignment } from '$lib/types/ReviewAssigment';
import { ReviewAssignmentSchema } from '../schemas/ReviewAssignmentSchema';

export type IReviewAssignment = ReviewAssignment & mongoose.Document;

const ReviewAssignment = mongoose.models.ReviewAssignment || mongoose.model<IReviewAssignment>('ReviewAssignment', ReviewAssignmentSchema);
export default ReviewAssignment;
