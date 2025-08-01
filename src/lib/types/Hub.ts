import type { User } from './User';

export type Hub = {
    _id: string;
    id: string;
    createdBy: User;
    title: string;
    type: 'Conference' | 'Journal' | 'Working Group';
    description: string;
    location: string;
    issn?: string;
    guidelinesUrl?: string;
    acknowledgement?: string;
    licenses: string[];
    extensions?: string;
    logoUrl?: string;
    bannerUrl?: string;
    cardUrl?: string;
    peerReview: 'Everyone' | 'Only Reviewers';
    authorInvite: 'Yes' | 'No';
    identityVisibility: 'Everyone' | 'Reviewers Only' | 'Hidden';
    reviewVisibility: 'Everyone' | 'Authors Only' | 'Hidden';
    socialMedia?: {
        twitter?: string;
        facebook?: string;
        website?: string;
        instagram?: string;
        linkedin?: string;
        youtube?: string;
        tiktok?: string;
        github?: string;
        discord?: string;
        telegram?: string;
        whatsapp?: string;
        wechat?: string;
    };
    tracks?: string;
    calendar?: string;
    showCalendar: boolean;
    dates: {
        submissionStart: { type: Date },
        submissionEnd: { type: Date },
        eventStart: { type: Date },
        eventEnd: { type: Date }
    },
    reviewers?: string[];
    submittedPapers?: string[];
    assignedReviews: Array<{
        paperId: string;
        reviewerId: string;
        status: 'assigned' | 'in_review' | 'completed';
        assignedAt: Date;
    }>;
    status: 'open' | 'closed';
    createdAt: string;
    updatedAt: string;
}
