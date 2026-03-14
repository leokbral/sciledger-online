import type { User } from './User';
import type { Paper } from './Paper';
import type { Hub } from './Hub';

export type PaperReviewInvitation = {
    _id: string;
    id: string;
    paper: Paper | string;
    reviewer: User | string;
    invitedBy: User | string;
    hubId: Hub | string;
    status: 'pending' | 'accepted' | 'declined';
    customDeadlineDays?: number; // Custom deadline in days (default 15)
    reviewAssignmentId?: string; // Reference to the created ReviewAssignment
    invitedAt: Date;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};
