/**
 * Sanitiza dados de paper do Mongoose para remover campos não serializáveis
 */
export function sanitizeReviewSlots(slots: any[]): any[] {
	if (!slots || !Array.isArray(slots)) return [];
	
	return slots.map(slot => ({
		slotNumber: slot.slotNumber,
		reviewerId: slot.reviewerId,
		status: slot.status,
		invitedAt: slot.invitedAt,
		acceptedAt: slot.acceptedAt,
		declinedAt: slot.declinedAt
	}));
}

/**
 * Sanitiza um paper completo removendo _id dos subdocumentos
 */
export function sanitizePaper(paper: any): any {
	if (!paper) return paper;

	// Sanitizar peer_review responses
	const peer_review = paper.peer_review
		? {
				reviewType: paper.peer_review.reviewType,
				assignedReviewers: paper.peer_review.assignedReviewers ?? [],
				responses: (paper.peer_review.responses ?? []).map((r: any) => ({
					reviewerId: r.reviewerId,
					status: r.status,
					responseDate: r.responseDate,
					assignedAt: r.assignedAt,
					completedAt: r.completedAt,
					reviewId: r.reviewId
				})),
				reviews: paper.peer_review.reviews ?? [],
				averageScore: paper.peer_review.averageScore ?? 0,
				reviewCount: paper.peer_review.reviewCount ?? 0,
				reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
		  }
		: undefined;

	// Sanitizar reviewSlots
	const reviewSlots = sanitizeReviewSlots(paper.reviewSlots);

	// Sanitizar scopusClassifications (remover _id dos subdocuments)
	const scopusClassifications = paper.scopusClassifications?.map((classification: any) => ({
		area: classification.area,
		subArea: classification.subArea
	})) ?? undefined;

	return {
		...paper,
		peer_review,
		reviewSlots,
		maxReviewSlots: paper.maxReviewSlots || 3,
		availableSlots: paper.availableSlots ?? 3,
		scopusClassifications
	};
}
