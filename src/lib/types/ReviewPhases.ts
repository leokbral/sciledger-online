/**
 * Enumeração das 4 fases do processo de revisão
 */
export enum ReviewPhase {
    PHASE_1_INITIAL_REVIEW = 'phase1_initial_review',           // Primeira revisão pelos revisores
    PHASE_2_AUTHOR_CORRECTIONS = 'phase2_author_corrections',   // Correções pelo autor
    PHASE_3_FINAL_REVIEW = 'phase3_final_review',              // Revisão final pelos revisores
    PHASE_4_FINAL_DECISION = 'phase4_final_decision'           // Decisão final (publicar/rejeitar)
}

/**
 * Mapeamento de status do paper para fases
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
 * Informações sobre cada fase
 */
export const PHASE_INFO = {
    [ReviewPhase.PHASE_1_INITIAL_REVIEW]: {
        name: 'Initial Review by Peers',
        description: 'Reviewers analyze and provide feedback',
        duration: 15, // dias
        timestampKey: 'phase1_initial_review_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    },
    [ReviewPhase.PHASE_2_AUTHOR_CORRECTIONS]: {
        name: 'Author Corrections',
        description: 'Author implements reviewer feedback',
        duration: 15, // dias
        timestampKey: 'phase2_author_corrections_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    },
    [ReviewPhase.PHASE_3_FINAL_REVIEW]: {
        name: 'Final Review by Peers',
        description: 'Reviewers verify corrections',
        duration: 10, // dias (menor prazo para revisão final)
        timestampKey: 'phase3_final_review_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    },
    [ReviewPhase.PHASE_4_FINAL_DECISION]: {
        name: 'Final Decision',
        description: 'Editorial decision for publication',
        duration: 7, // dias (decisão editorial)
        timestampKey: 'phase4_final_decision_started' as keyof NonNullable<import('$lib/types/Paper').Paper['phaseTimestamps']>
    }
};

/**
 * Determina a fase atual baseada no status do paper
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