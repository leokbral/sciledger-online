import type { Paper } from '$lib/types/Paper';
import type { User } from '$lib/types/User';

export type EligibilityResult = {
    eligible: boolean;
    reasons: string[];
    score?: number;
};

/**
 * Checks reviewer eligibility based on common rules.
 * Rules:
 * - Must have role.reviewer = true
 * - Must not be main author, co-author, or submittedBy of the paper
 * - If paper is linked to a hub, reviewer must belong to that hub's reviewers list
 * - Must not already be assigned/occupying a slot on the paper
 * - Capacity: must have fewer than maxActive (default 3) active assignments (accepted|pending)
 * - Optional expertise-keyword overlap: if both exist, require at least one overlap
 */
export function checkReviewerEligibility(
    paper: Paper,
    reviewer: User,
    opts?: {
        hubReviewerIds?: string[];
        alreadyAssignedIds?: Array<string>;
        maxActiveAssignments?: number;
        activeAssignmentsCount?: number;
        requireExpertiseMatch?: boolean;
    }
): EligibilityResult {
    const reasons: string[] = [];
    const maxActive = opts?.maxActiveAssignments ?? 3;
    const activeCount = opts?.activeAssignmentsCount ?? 0;
    const assignedIds = new Set((opts?.alreadyAssignedIds ?? []).map(String));

    // Role check
    if (!reviewer?.roles?.reviewer) {
        reasons.push('Reviewer role not enabled');
    }

    const reviewerId = String(reviewer.id || reviewer._id);
    const reviewerAltId = reviewer.id && (reviewer as any)._id && String(reviewer.id) !== String((reviewer as any)._id)
        ? String((reviewer as any)._id)
        : undefined;

    // Conflict of interest: author/co-author/submittedBy
    const mainAuthorId = typeof paper.mainAuthor === 'object' ? String(paper.mainAuthor._id || paper.mainAuthor.id) : String(paper.mainAuthor);
    const coAuthorIds = (paper.coAuthors || []).map(a => typeof a === 'object' ? String(a._id || a.id) : String(a));
    const submittedById = typeof paper.submittedBy === 'object' ? String((paper.submittedBy as any)._id || (paper.submittedBy as any).id) : String(paper.submittedBy);

    if ([mainAuthorId, submittedById, ...coAuthorIds].filter(Boolean).includes(reviewerId)) {
        reasons.push('Conflict of interest: reviewer is an author or submitter');
    }

    // Hub membership if linked to hub
    const isLinkedToHub = !!paper.hubId;
    if (isLinkedToHub) {
        const hubReviewerIds = new Set((opts?.hubReviewerIds || []).map(String));
        if (!hubReviewerIds.has(reviewerId) && !(reviewerAltId && hubReviewerIds.has(reviewerAltId))) {
            reasons.push('Reviewer not part of this hub');
        }
    }

    // Already assigned to paper
    if (assignedIds.has(reviewerId) || (reviewerAltId && assignedIds.has(reviewerAltId))) {
        reasons.push('Reviewer already assigned to this paper');
    }

    // Capacity check
    if (activeCount >= maxActive) {
        reasons.push('Reviewer exceeds active review capacity');
    }

    // Expertise-keyword overlap (optional)
    if (opts?.requireExpertiseMatch) {
        const keywords = (paper.keywords || []).map(k => (k || '').toLowerCase());
        const expertise = (reviewer.performanceReviews?.expertise || []).map(e => (e || '').toLowerCase());
        if (keywords.length > 0 && expertise.length > 0) {
            const hasOverlap = expertise.some(e => keywords.includes(e));
            if (!hasOverlap) {
                reasons.push('No expertise-keyword overlap');
            }
        }
    }

    return {
        eligible: reasons.length === 0,
        reasons,
    };
}
