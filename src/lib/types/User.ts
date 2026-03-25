import type { Paper } from "./Paper";

export type User = {
	_id: string; // Internal MongoDB ID
	id: string; // Unique generated user ID
    //name: string; // User name
    firstName: string; 
    lastName: string; 
    country: string; 
    dob: string;
    username: string; // User handle, similar to Twitter's @username
    email: string; // User email
    password: string; // User password
    refreshToken?: string; // Token for managing login sessions
    resetPasswordToken: string;
    resetPasswordExpiry: string; // Password reset token expiry
    emailVerified: boolean; // Email verification
    darkMode: boolean; // Dark mode
    roles: {
        author: boolean; // Whether the user is an author
        reviewer: boolean; // Whether the user is a reviewer
    };
    bio?: string; // User biography
    profilePictureUrl?: string; // Profile picture URL
    institution?: string; // User's associated institution
    position?: string; // User's position
    performanceReviews?: {
        averageReviewDays?: number; // Average review days
        recommendations?: string[]; // Received recommendations
        responseTime?: number; // Average response time (in hours)
        expertise?: string[]; // User's areas of expertise
    };
    reviewerPayments?: {
        stripeConnectAccountId?: string;
        onboardingComplete?: boolean;
        detailsSubmitted?: boolean;
        chargesEnabled?: boolean;
        payoutsEnabled?: boolean;
        defaultCurrency?: string;
        totalEarnedCents?: number;
        totalPaidOutCents?: number;
        pendingPayoutCents?: number;
        onboardingStartedAt?: Date;
        onboardingCompletedAt?: Date;
        lastPayoutAt?: Date;
    };
    connections: string[]; // IDs of connected users
    followers: User[]; // IDs of followers
    following: User[]; // IDs of followed users
    papers: Paper[]; // IDs of the user's publications
    hubs?: string[]; // IDs of the user's associated hubs
    // OAuth ORCID Integration
    orcid?: string; // User's ORCID iD (e.g. 0000-0001-2345-6789)
    orcidAccessToken?: string; // ORCID access token for APIs
    orcidRefreshToken?: string; // ORCID refresh token for renewal
    createdAt: Date; // Creation date
    updatedAt: Date; // Last update date
};