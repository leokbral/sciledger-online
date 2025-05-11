import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const ReviewSchema: Schema = new Schema({
	_id: { type: String, required: true },
	id: { type: String, default: () => crypto.randomUUID(), unique: true },

	paper: { type: String, required: true, ref: 'Paper' },
	reviewer: { type: String, required: true, ref: 'User' },

	reviewType: {
		type: String,
		enum: ['open', 'selected'],
		required: true,
		default: 'open'
	},

	// Avaliações por critérios específicos
	technicalCorrectness: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	novelty: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	figuresQuality: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	experimentalQuality: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	reproducibility: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	importance: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	clarity: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },
	length: { type: String, enum: ['Too Short', 'Acceptable', 'Too Long'] },
	generalOverview: { type: String, enum: ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'] },

	recommendation: {
		type: String,
		enum: ['Accept', 'Weak accept', 'Indifferent', 'Weak reject', 'Reject'],
		required: true
	},

	// Comentários
	commentsToAuthor: { type: String, required: true },
	confidentialComments: { type: String },

	// Pontuação geral (usado no modelo anterior)
	score: { type: Number, min: 0, max: 5 },

	comments: { type: String }, // Pode ser mantido para compatibilidade

	status: {
		type: String,
		enum: ['pending', 'accepted', 'rejected', 'needs_revision'],
		default: 'pending',
		required: true
	},

	responseTime: { type: Number, default: 0 },
	assignedAt: { type: String, default: () => new Date().toISOString() },
	completedAt: { type: String },

	feedbackForAuthor: { type: String },
	feedbackForReviewer: { type: String },
	isFeedbackAcknowledged: { type: Boolean, default: false },

	createdAt: { type: String, default: () => new Date().toISOString() },
	updatedAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'reviews' });
