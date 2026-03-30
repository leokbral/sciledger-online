import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const UserSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true }, // Generating a UUID as default for userId
    firstName: { type: String, required: true, unique: false }, // First name
    lastName: { type: String, required: true, unique: false }, // Last name
    country: { type: String, required: false, unique: false, default: '' }, // Country (optional for ORCID)
    dob: { type: String, required: false, unique: false, default: '' }, // Date of Birth (optional for ORCID)
    username: { type: String, required: true, unique: true }, // User handle, unique and required
    email: { type: String, required: true, unique: true }, // User email
    password: { type: String, required: false }, // User password (optional for ORCID login)
    refreshToken: { type: String }, // Token for managing login sessions
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: String }, // Password reset token expiry
    emailVerified: { type: Boolean, default: false }, // Email verification
    // ORCID OAuth fields
    orcid: { type: String, unique: true, sparse: true }, // User's ORCID iD
    orcidAccessToken: { type: String }, // ORCID access token
    orcidRefreshToken: { type: String }, // ORCID refresh token
    orcidTokenExpiry: { type: Date }, // ORCID token expiry date
    profileCompletedAt: { type: Date }, // When user completed their profile (especially after ORCID login)
    darkMode: { type: Boolean, default: false }, // Dark mode
    roles: { // User roles definition
        author: { type: Boolean, default: true },
        reviewer: { type: Boolean, default: false }
    },
    bio: { type: String, default: '' }, // User biography with default value
    profilePictureUrl: { type: String, default: '' }, // Profile picture URL with default value
    institution: { type: String, default: '' }, // Institution with default value
    position: { type: String, default: '' }, // User's position with default value
    performanceReviews: { // User performance information
        averageReviewDays: { type: Number, default: 0 }, // Average review days with default value
        recommendations: [{ type: String, default: '' }], // Received recommendations
        responseTime: { type: Number, default: 0 }, // Average response time with default value
        expertise: [{ type: String, default: '' }] // Areas of expertise with default value
    },
    reviewerPayments: {
        stripeConnectAccountId: { type: String, default: '' },
        onboardingComplete: { type: Boolean, default: false },
        detailsSubmitted: { type: Boolean, default: false },
        chargesEnabled: { type: Boolean, default: false },
        payoutsEnabled: { type: Boolean, default: false },
        defaultCurrency: { type: String, default: 'brl' },
        totalEarnedCents: { type: Number, default: 0 },
        totalPaidOutCents: { type: Number, default: 0 },
        pendingPayoutCents: { type: Number, default: 0 },
        onboardingStartedAt: { type: Date },
        onboardingCompletedAt: { type: Date },
        lastPayoutAt: { type: Date }
    },
    connections: [{ type: String, ref: 'User' }], // IDs of connected users
    followers: [{ type: String, ref: 'User' }], // IDs of followers
    following: [{ type: String, ref: 'User' }], // IDs of followed users
    papers: [{ type: String, ref: 'Paper' }], // IDs of the user's publications
    hubs: [{ type: String, ref: 'Hub', default: [] }], // IDs of the user's hubs
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
});