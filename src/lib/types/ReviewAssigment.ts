import mongoose from 'mongoose';
import type { IReviewAssignment } from '$lib/db/models/ReviewAssignment';
import { ReviewAssignmentSchema } from '$lib/db/schemas/ReviewAssignmentSchema';

export type ReviewAssignment = {
    id: string;
    paperId: string;
    reviewerId: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired' | 'overdue';
    assignedAt: Date;
    acceptedAt?: Date;
    completedAt?: Date;
    deadline?: Date;
    respondedAt?: Date;
    hubId?: string;
    isLinkedToHub: boolean;
    remindersSent: number;
    lastReminderAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewAssignment = mongoose.model<IReviewAssignment>('ReviewAssignment', ReviewAssignmentSchema);
export default ReviewAssignment;