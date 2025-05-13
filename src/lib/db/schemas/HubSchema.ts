import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const HubSchema: Schema = new Schema({
	_id: { type: String, required: true },
	id: { type: String, default: () => crypto.randomUUID(), unique: true },

	title: { type: String, required: true },
	type: { type: String, enum: ['Conference', 'Journal', 'Working Group'], required: true }, // novo campo
	description: { type: String, required: true },
	location: { type: String, default: 'online' },

	issn: { type: String },
	guidelinesUrl: { type: String },
	acknowledgement: { type: String },
	licenses: [{ type: String }], // array de strings
	extensions: { type: String },

	logoUrl: { type: String },
	bannerUrl: { type: String },
	cardUrl: { type: String },

	peerReview: { type: String, enum: ['Everyone', 'Only Reviewers'], default: 'Everyone' },
	authorInvite: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
	identityVisibility: { type: String, enum: ['Everyone', 'Reviewers Only', 'Hidden'], default: 'Everyone' },
	reviewVisibility: { type: String, enum: ['Everyone', 'Authors Only', 'Hidden'], default: 'Everyone' },

	socialMedia: {
		twitter: { type: String },
        facebook: { type: String },
        website: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
        youtube: { type: String },
        tiktok: { type: String },
        github: { type: String },
        discord: { type: String },
        telegram: { type: String },
        whatsapp: { type: String },
        wechat: { type: String },
	},

	tracks: { type: String },
	calendar: { type: String },
	showCalendar: { type: Boolean, default: false },

	dates: {
		submissionStart: { type: Date },
		submissionEnd: { type: Date },
		eventStart: { type: Date },
		eventEnd: { type: Date }
	},

	createdBy: { type: String, required: true, ref: 'User' },
	reviewers: [{ type: String, ref: 'User' }],
	submittedPapers: [{ type: String, ref: 'Paper' }],
	assignedReviews: [{
		paperId: { type: String, ref: 'Paper' },
		reviewerId: { type: String, ref: 'User' },
		status: { type: String, enum: ['assigned', 'in_review', 'completed'], default: 'assigned' },
		assignedAt: { type: Date, default: Date.now }
	  }],
	  

	status: {
		type: String,
		enum: ['open', 'closed'],
		default: 'open'
	},

	createdAt: { type: String, default: () => new Date().toISOString() },
	updatedAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'hubs' });
