import type { User } from "./User";
import type { Paper } from "./Paper";

// ReviewType.ts
export type Review = {
    _id: string; // Internal MongoDB ID
	id: string; // Generated UUID for unique review identification

	paperId: Paper | string; // ID of the paper being evaluated
	reviewerId: User | string; // ID of the reviewer responsible for the evaluation
	paperTitle: string; // Paper title

	// Part I – Quantitative Evaluation (scores from 1 to 5)
	quantitativeEvaluation: {
		originality: number; // Originality
		clarity: number; // Clarity
		literatureReview: number; // Literature review
		theoreticalFoundation: number; // Theoretical foundation
		methodology: number; // Methodology
		reproducibility: number; // Reproducibility
		results: number; // Results
		figures: number; // Figures
		limitations: number; // Limitations
		language: number; // Language
		impact: number; // Impact
	};

	// Part II – Qualitative Evaluation
	qualitativeEvaluation: {
		strengths: string; // Strengths
		weaknesses: string; // Weaknesses
	};

	// Part III – Ethics
	ethics: {
		involvesHumanResearch: 'yes' | 'no' | ''; // Involves human research?
		ethicsApproval?: 'adequate' | 'justified' | 'absent' | ''; // Ethics approval
	};

	// Part IV – Recommendation
	recommendation: 'accept_without_changes' | 'accept_with_minor_revisions' | 'major_revision' | 'reject' | '';

	// Calculated fields
	averageScore: number; // Average score
	weightedScore: number; // Weighted score

	// Status and metadata
	status: 'draft' | 'submitted' | 'completed'; // Review state
	reviewRound: 1 | 3; // 1 = first round (phase 1), 3 = second round (phase 3)
	submissionDate?: Date; // Submission date
	completionDate?: Date; // Completion date
	createdAt: Date; // Record creation date
	updatedAt: Date; // Record last update date
};

export type ReviewCriteria = {
	name: keyof Review['quantitativeEvaluation']; // Criterion name
	title: string; // Criterion title
	description: string; // Criterion description
	options: string[]; // Available options for the criterion
	weight: string; // Criterion weight in the evaluation
};
