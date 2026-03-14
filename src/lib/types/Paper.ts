import type { Hub } from "./Hub";
import type { User } from "./User";
import type { Review } from "./Review";

export type Paper = {
    _id: string; // Internal MongoDB ID
    id: string; // Unique paper ID
    mainAuthor: User; // Main author as UUID
    correspondingAuthor: User; // Corresponding author as UUID
    coAuthors: User[]; // List of co-authors as UUIDs
    reviewers: Array<User | string>; // List of reviewers as User objects or UUIDs
    title: string;
    abstract: string;
    keywords: string[];
    content: string;
    pdfUrl: string;
    doi?: string;
    paperPictures: string[]; // Paper images
    citations: string[]; // List of citation UUIDs
    likes: string[]; // List of users who liked as UUIDs
    comments: string[]; // List of comments as UUIDs
    tags: string[];
    status: string;
    price: number;
    score: number;
    authors: User[],
    peer_review?: {
        reviewType: 'open' | 'selected';
        assignedReviewers: Array<User | string>;
        responses: Array<{
			_id: string;
            reviewerId: User;
            status: 'pending' | 'accepted' | 'declined' | 'completed';
            responseDate?: Date;
            assignedAt?: Date;
            completedAt?: Date;
            reviewId?: string;
        }>;
        // Review-related fields
        reviews: Review[]; // List of associated reviews
        averageScore: number; // Average review score
        reviewCount: number; // Number of completed reviews
        reviewStatus: 'not_started' | 'in_progress' | 'completed';
    };

    /*  peer_review: {
         reviewType: 'open' | 'selected'; // Review type: 'open' for any reviewer, 'selected' for specific reviewers
         assignedReviewers: User[]; // List of specific reviewers if 'selected'
         reviewerResponses: {
             reviewerId: User; // Reviewer UUID
             counterProposal?: string; // Reviewer counter-proposal (optional)
             responseStatus: 'accepted' | 'declined' | 'counter-proposal' | 'pending'; // Overall reviewer response status
             reviewerComments: string[]; // Reviewer comments
         }[];
     }; */
    createdAt: Date;
    updatedAt: Date;
    submittedBy: User; // User who submitted the paper
    hubId?: string | Hub| null;
    isLinkedToHub?: boolean;
    correctionProgress?: Record<string, boolean>; // Corrections progress (checklist)
    
    // Review Slot System (max 3 reviewers)
    reviewSlots?: Array<{
        slotNumber: number; // 1, 2, or 3
        reviewerId: string | User | null; // Reviewer ID occupying the slot (null if empty)
        status: 'available' | 'pending' | 'occupied' | 'declined'; // Slot status
        invitedAt?: Date; // When invitation was sent
        acceptedAt?: Date; // When reviewer accepted
        declinedAt?: Date; // When reviewer declined
    }>;
    maxReviewSlots?: number; // Maximum number of slots (default: 3)
    availableSlots?: number; // Available slots (calculated)
    reviewRound?: number; // Track which review round (1 = first, 2 = after corrections)
    phaseTimestamps?: {
        round1Start?: Date;
        round1End?: Date;
        correctionStart?: Date;
        correctionEnd?: Date;
        round2Start?: Date;
        round2End?: Date;
    };
    scopusArea?: string; // Scopus subject area (deprecated - use scopusClassifications)
    scopusSubArea?: string; // Scopus subject sub-area (deprecated - use scopusClassifications)
    scopusClassifications?: Array<{
        area: string; // Scopus subject area
        subArea: string; // Scopus subject sub-area
    }>; // Multiple Scopus classifications for interdisciplinary papers
    rejectedByHub?: boolean; // Paper rejected by hub admin
    isAcceptedForReview?: boolean; // Indicates whether current user accepted designated review
    rejectionReason?: string; // Reason for rejection
    rejectedAt?: Date; // When it was rejected
    rejectedBy?: User | string; // Who rejected it
    supplementaryMaterials?: Array<{
        id: string; // Unique ID for this item
        title: string; // Title/description of the material
        url: string; // Repository URL
        type: 'github' | 'figshare' | 'zenodo' | 'osf' | 'dataverse' | 'other'; // Repository type
        description?: string; // Detailed description
        createdAt?: Date; // When it was added
        updatedAt?: Date; // Last update
    }>;
}