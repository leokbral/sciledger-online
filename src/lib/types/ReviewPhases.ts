/**
 * Enum for the 4 phases of the review process
 */
export enum ReviewPhase {
    PHASE_1_INITIAL_REVIEW = 'phase1_initial_review',           // Initial review by reviewers
    PHASE_2_AUTHOR_CORRECTIONS = 'phase2_author_corrections',   // Author corrections
    PHASE_3_FINAL_REVIEW = 'phase3_final_review',              // Final review by reviewers
    PHASE_4_FINAL_DECISION = 'phase4_final_decision'           // Final decision (publish/reject)
}

/**
 * Mapping of paper status to phases
 */
export const STATUS_TO_PHASE_MAP: Record<string, ReviewPhase> = {
    'in review': ReviewPhase.PHASE_1_INITIAL_REVIEW,
    'needing corrections': ReviewPhase.PHASE_2_AUTHOR_CORRECTIONS,
    'under final review': ReviewPhase.PHASE_3_FINAL_REVIEW,
    'awaiting final decision': ReviewPhase.PHASE_4_FINAL_DECISION,
    'published': ReviewPhase.PHASE_4_FINAL_DECISION,
    'rejected': ReviewPhase.PHASE_4_FINAL_DECISION
};

/**
 * Information about each phase
 */
export const PHASE_INFO = {
    [ReviewPhase.PHASE_1_INITIAL_REVIEW]: {
        name: 'Initial Review by Peers',
        description: 'Reviewers analyze and provide feedback',
        duration: 15, // days
        timestampKey: 'phase1_initial_review_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    },
    [ReviewPhase.PHASE_2_AUTHOR_CORRECTIONS]: {
        name: 'Author Corrections',
        description: 'Author implements reviewer feedback',
        duration: 15, // days
        timestampKey: 'phase2_author_corrections_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    },
    [ReviewPhase.PHASE_3_FINAL_REVIEW]: {
        name: 'Final Review by Peers',
        description: 'Reviewers verify corrections',
        duration: 10, // days (shorter deadline for final review)
        timestampKey: 'phase3_final_review_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    },
    [ReviewPhase.PHASE_4_FINAL_DECISION]: {
        name: 'Final Decision',
        description: 'Editorial decision for publication',
        duration: 7, // days (editorial decision)
        timestampKey: 'phase4_final_decision_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    }
};

/**
 * Determines the current phase based on the paper status
 */
export function getCurrentPhase(paperStatus: string): ReviewPhase | null {
    return STATUS_TO_PHASE_MAP[paperStatus] || null;
}

/**
 * Retorna informações sobre uma fase específica
 */
export function getPhaseInfo(phase: ReviewPhase) {
    return PHASE_INFO[phase];
}

/**
 * Verifica se é necessário capturar timestamp para uma nova fase
 */
export function shouldCapturePhaseTimestamp(
    currentStatus: string,
    newStatus: string,
    existingTimestamps?: NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
): { shouldCapture: boolean; phase?: ReviewPhase; timestampKey?: string } {
    const newPhase = getCurrentPhase(newStatus);
    const currentPhase = getCurrentPhase(currentStatus);
    
    // Se mudou para uma nova fase
    if (newPhase && newPhase !== currentPhase) {
        const phaseInfo = getPhaseInfo(newPhase);
        
        // Só captura se ainda não foi capturado
        if (!existingTimestamps?.[phaseInfo.timestampKey]) {
            return {
                shouldCapture: true,
                phase: newPhase,
                timestampKey: phaseInfo.timestampKey
            };
        }
    }
    
    return { shouldCapture: false };
}