import { Schema, type HydratedDocument } from 'mongoose';
import * as crypto from 'crypto';
import type { Review } from '$lib/types/Review';

export const ReviewSchema: Schema = new Schema({
	_id: { type: String, required: true },
	id: { type: String, default: () => crypto.randomUUID(), unique: true },
	paperId: { type: String, required: true, ref: 'Paper' },
	reviewerId: { type: String, required: true, ref: 'User' },
	paperTitle: { type: String, required: true },

	// Part I – Quantitative Evaluation (scores 1-5)
	quantitativeEvaluation: {
		originality: { type: Number, min: 0, max: 5, default: 0 },
		clarity: { type: Number, min: 0, max: 5, default: 0 },
		literatureReview: { type: Number, min: 0, max: 5, default: 0 },
		theoreticalFoundation: { type: Number, min: 0, max: 5, default: 0 },
		methodology: { type: Number, min: 0, max: 5, default: 0 },
		reproducibility: { type: Number, min: 0, max: 5, default: 0 },
		results: { type: Number, min: 0, max: 5, default: 0 },
		figures: { type: Number, min: 0, max: 5, default: 0 },
		limitations: { type: Number, min: 0, max: 5, default: 0 },
		language: { type: Number, min: 0, max: 5, default: 0 },
		impact: { type: Number, min: 0, max: 5, default: 0 }
	},

	// Part II – Qualitative Evaluation
	qualitativeEvaluation: {
		strengths: { type: String, default: '' },
		weaknesses: { type: String, default: '' }
	},

	// Part III – Ethics
	ethics: {
		involvesHumanResearch: { type: String, enum: ['yes', 'no', ''], default: '' },
		ethicsApproval: { type: String, enum: ['adequate', 'justified', 'absent', ''], default: '' }
	},

	// Part IV – Recommendation
	recommendation: {
		type: String,
		enum: ['accept_without_changes', 'accept_with_minor_revisions', 'major_revision', 'reject', ''],
		default: ''
	},

	// Calculated fields
	averageScore: { type: Number, default: 0, min: 0, max: 5 },
	weightedScore: { type: Number, default: 0, min: 0, max: 5 },

	// Status and metadata
	status: { type: String, enum: ['draft', 'submitted', 'completed'], default: 'draft' },
	submissionDate: { type: Date },
	completionDate: { type: Date },
	createdAt: { type: Date, default: () => new Date() },
	updatedAt: { type: Date, default: () => new Date() }

}, { collection: 'reviews' });

// Pre-save middleware to calculate scores
ReviewSchema.pre('save', function (next) {
	const review = this as HydratedDocument<Review>;

	// Calculate average score
	const scores = Object.values(review.quantitativeEvaluation).filter((score): score is number => typeof score === 'number' && score > 0);
	if (scores.length > 0) {
		review.averageScore = Number((scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2));
	}

	// Calculate weighted score
	const weights = {
		originality: 0.15,
		clarity: 0.08,
		literatureReview: 0.07,
		theoreticalFoundation: 0.08,
		methodology: 0.15,
		reproducibility: 0.07,
		results: 0.15,
		figures: 0.05,
		limitations: 0.05,
		language: 0.05,
		impact: 0.10
	};

	let totalScore = 0;
	let totalWeight = 0;

	Object.entries(review.quantitativeEvaluation).forEach(
		([key, score]) => {
			if (score > 0) {
				const weight = weights[key as keyof typeof weights];
				totalScore += score * weight;
				totalWeight += weight;
			}
		}
	);


	if (totalWeight > 0) {
		review.weightedScore = Number((totalScore / totalWeight).toFixed(2));
	}

	// Update timestamps
	review.updatedAt = new Date();

	next();
});
