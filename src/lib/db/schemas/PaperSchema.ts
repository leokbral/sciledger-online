import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const PaperSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true }, // Generating a UUID as default for id
    mainAuthor: { type: String, required: true, ref: 'User' }, // Main author as UUID
    correspondingAuthor: { type: String, required: true, ref: 'User' }, // Corresponding author as UUID
    coAuthors: [{ type: String, ref: 'User' }], // List of co-authors as UUIDs
    reviewers: [{ type: String, ref: 'User' }], // List of reviewers as UUIDs
    title: { type: String, required: true },
    abstract: { type: String, required: true },
    keywords: [{ type: String, required: true }],
    content: { type: String },
    pdfUrl: { type: String, required: true },
    doi: { type: String, unique: true, sparse: true },
    paperPictures: [{ type: String }], // Renamed from articlePictures to paperPictures
    citations: [{ type: String }], // List of citations as UUIDs
    likes: [{ type: String }], // List of users who liked as UUIDs
    comments: [{ type: String }], // List of comments as UUIDs
    tags: [{ type: String }],
    status: { type: String, required: true, enum: ['draft', 'under negotiation', 'in review', 'needing corrections', 'published', 'rejected'], default: 'draft' },
    price: { type: Number, required: true }, // Publication price field
    score: { type: Number, default: 0, min: 0, max: 5 }, // Publication score field, default 0, range 0 to 5
    authors: [{ type: String, ref: 'User' }],
    peer_review: {
        type: {
            reviewType: { type: String, enum: ['open', 'selected'], required: true },
            assignedReviewers: [{ type: String, ref: 'User' }],
            responses: [{
                _id: false, // Disable automatic Mongoose _id
                reviewerId: { type: String, ref: 'User' },
                status: {
                    type: String,
                    enum: ['pending', 'accepted', 'declined', 'completed'],
                    default: 'pending'
                },
                responseDate: { type: Date },         // When accepted/declined
                assignedAt: { type: Date },           // When officially assigned
                completedAt: { type: Date },          // When the review was completed
                reviewId: { type: String, ref: 'Review' }  // ID of the connected review
            }],
            // Add references to reviews
            reviews: [{ type: String, ref: 'Review' }], // List of associated reviews
            averageScore: { type: Number, default: 0, min: 0, max: 5 }, // Average score
            reviewCount: { type: Number, default: 0 }, // Number of completed reviews
            reviewStatus: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' }
        }
    },

    // peer_review: [{ type: String, ref: 'Review' }], // This field now references ReviewSchema
    /* peer_review: {
        type: {
            reviewType: { type: String, enum: ['open', 'selected'], required: true }, // Review type: 'open' for any reviewer, 'selected' for specific reviewers
            assignedReviewers: [{ type: String, ref: 'User' }], // List of specific reviewers if 'selected'
            reviewerResponses: [{
                reviewerId: { type: String, ref: 'User' }, // Reviewer UUID
                counterProposal: { type: String }, // Reviewer counter-proposal
                responseStatus: { type: String, enum: ['accepted', 'declined', 'counter-proposal', 'pending'], default: 'pending' }, // Overall reviewer response status
                reviewerComments: [{ type: String }] // Reviewer comments
            }]
        }
    }, */
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    submittedBy: { type: String, required: true, ref: 'User' }, // Field for who submitted the paper
    hubId: { type: String, ref: 'Hub', required: false },
    isLinkedToHub: { type: Boolean, default: false },
    
    // Field to store corrections progress (checklist)
    correctionProgress: {
        type: Map,
        of: Boolean,
        default: new Map()
    },
    
    // Review Slot System (max 3 reviewers)
    reviewSlots: [{
        _id: false, // Disable automatic Mongoose _id
        slotNumber: { type: Number, required: true }, // 1, 2, or 3
        reviewerId: { type: String, ref: 'User', default: null }, // Reviewer ID (null if empty)
        status: { 
            type: String, 
            enum: ['available', 'pending', 'occupied', 'declined'], 
            default: 'available' 
        },
        invitedAt: { type: Date }, // When the invitation was sent
        acceptedAt: { type: Date }, // When the reviewer accepted
        declinedAt: { type: Date } // When the reviewer declined
    }],
    maxReviewSlots: { type: Number, default: 3 }, // Maximum number of slots
    availableSlots: { type: Number, default: 3 }, // Available slots
    
    // Track which review round this paper is in (1 = first review, 2 = review after corrections)
    reviewRound: { type: Number, default: 1 },
    
    // Track phase timestamps for each round
    phaseTimestamps: {
        round1Start: { type: Date },
        round1End: { type: Date },
        correctionStart: { type: Date },
        correctionEnd: { type: Date },
        round2Start: { type: Date },
        round2End: { type: Date }
    },
    
    // Scopus subject classification
    scopusArea: { type: String }, // Deprecated - kept for backward compatibility
    scopusSubArea: { type: String }, // Deprecated - kept for backward compatibility
    scopusClassifications: [{
        area: { type: String, required: true },
        subArea: { type: String, required: true }
    }], // Multiple Scopus classifications for interdisciplinary papers
    
    // Hub rejection fields
    rejectedByHub: { type: Boolean, default: false },
    rejectionReason: { type: String },
    rejectedAt: { type: Date },
    rejectedBy: { type: String, ref: 'User' },
    
    // Supplementary Material - Links to public repositories
    supplementaryMaterials: [{
        _id: false, // Disable automatic Mongoose _id
        id: { type: String, required: true }, // Unique ID for this item
        title: { type: String, required: true }, // Title/description of the material
        url: { type: String, required: true }, // Repository URL
        type: { 
            type: String, 
            enum: ['github', 'figshare', 'zenodo', 'osf', 'dataverse', 'other'],
            required: true 
        }, // Repository type
        description: { type: String }, // Detailed description
        createdAt: { type: Date, default: () => new Date() }, // When it was added
        updatedAt: { type: Date, default: () => new Date() } // Last update
    }]

}, { collection: 'papers' });

