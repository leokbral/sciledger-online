import type { User } from './User';

export type ReviewQueue = {
    _id: string; // Queue ID (used by Mongoose as the primary identifier)
    id: string; // Unique ID generated, e.g. using uuid
    paperId: string; // ID of the paper related to the review
    reviewer: User; // Single reviewer for this request
    peerReviewType: 'open' | 'selected'; // Review type
    hubId?: string; // Hub ID, if applicable
    isLinkedToHub: boolean; // Indicates whether linked to a hub
    status: 'pending' | 'accepted' | 'declined'; // Reviewer response status
    assignedAt: Date; // When assigned
    respondedAt?: Date; // When the reviewer responded (if applicable)
    createdAt: Date;
    updatedAt: Date;
};
