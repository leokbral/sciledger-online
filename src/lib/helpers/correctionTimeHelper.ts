import type { Paper } from '$lib/types/Paper';
import type { User } from '$lib/types/User';
import { getCurrentPhase, getPhaseInfo, type ReviewPhase } from '$lib/types/ReviewPhases';

/**
 * Calculates the remaining time for correction process (15 days from the appropriate start point)
 * @param paper - The Paper object
 * @param userRole - The role of the current user ('author' | 'reviewer')
 * @param userId - The ID of the current user (to check reviewer-specific deadlines)
 * @param reviewAssignments - Optional array of ReviewAssignment objects to use custom deadlines
 * @returns Object with information about the remaining time
 */
export function getCorrectionTimeRemaining(
    paper: Paper, 
    userRole?: 'author' | 'reviewer', 
    userId?: string,
    reviewAssignments?: any[]
) {
    const CORRECTION_DEADLINE_DAYS = 15;
    
    console.log('=== getCorrectionTimeRemaining DEBUG ===');
    console.log('paper.id:', paper.id);
    console.log('paper.title:', paper.title);
    console.log('userRole:', userRole);
    console.log('userId:', userId);
    console.log('paper.status:', paper.status);
    console.log('paper.peer_review?.responses:', paper.peer_review?.responses);
    console.log('reviewAssignments:', reviewAssignments);
    
    // Se temos um ReviewAssignment customizado para este revisor/paper, usar o deadline dele
    if (userRole === 'reviewer' && userId && reviewAssignments) {
        console.log('🔍 Procurando ReviewAssignment customizado...');
        console.log('  - userId:', userId);
        console.log('  - paper.id:', paper.id);
        console.log('  - reviewAssignments:', reviewAssignments);
        
        const assignment = reviewAssignments.find(a => {
            const aPaperId = typeof a.paperId === 'object' ? (a.paperId._id || a.paperId.id) : a.paperId;
            const aReviewerId = typeof a.reviewerId === 'object' ? (a.reviewerId._id || a.reviewerId.id) : a.reviewerId;
            
            console.log('  - Comparing assignment:', {
                aPaperId,
                aReviewerId,
                paperIdMatch: aPaperId?.toString() === paper.id?.toString(),
                reviewerIdMatch: aReviewerId?.toString() === userId,
                deadline: a.deadline
            });
            
            return aPaperId?.toString() === paper.id?.toString() && aReviewerId?.toString() === userId;
        });
        
        console.log('  - Assignment encontrado:', assignment);
        
        if (assignment?.deadline) {
            console.log('🎯 Using custom deadline from ReviewAssignment:', assignment.deadline);
            const deadlineDate = new Date(assignment.deadline);
            const now = new Date();
            const timeDifference = deadlineDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.ceil(timeDifference / (1000 * 60 * 60));
            const isOverdue = timeDifference < 0;

            // Calcular a data de início REAL (aceitação do revisor)
            let correctionStartDate = assignment.acceptedAt ? new Date(assignment.acceptedAt) : undefined;
            // Se não houver acceptedAt, estimar pelo deadline menos o intervalo
            let totalDays = 15;
            if (correctionStartDate) {
                totalDays = Math.round((deadlineDate.getTime() - correctionStartDate.getTime()) / (1000 * 60 * 60 * 24));
            } else {
                // fallback: tentar usar o valor salvo no assignment, ou default 15
                correctionStartDate = new Date(deadlineDate);
                correctionStartDate.setDate(correctionStartDate.getDate() - totalDays);
            }

            console.log('✅ Retornando deadline customizado:', {
                deadlineDate,
                daysRemaining,
                isOverdue,
                correctionStartDate,
                totalDays
            });

            return {
                hasDeadline: true,
                daysRemaining: isOverdue ? Math.abs(daysRemaining) : daysRemaining,
                hoursRemaining: isOverdue ? Math.abs(hoursRemaining) : hoursRemaining,
                isOverdue,
                deadlineDate,
                correctionStartDate,
                totalDays,
                correctionType: 'reviewer' as const,
                isCustomDeadline: true
            };
        }
    }
    
    let correctionStartDate: Date | null = null;
    let correctionType: 'author' | 'reviewer' = 'author';
    
    // Determine the correction type and start date based on paper status and user role
    if (userRole === 'reviewer' && userId && paper.peer_review?.responses) {
        // For reviewers: INDIVIDUAL 15 days from when THEY accepted the correction task
        correctionType = 'reviewer';
        const reviewerResponse = paper.peer_review.responses.find(
            response => response.reviewerId._id === userId || response.reviewerId.id === userId
        );
        
        // Use the reviewer's individual acceptance date (responseDate when they accepted)
        if (reviewerResponse && reviewerResponse.status === 'accepted' && reviewerResponse.responseDate) {
            correctionStartDate = new Date(reviewerResponse.responseDate);
            console.log(`Individual reviewer ${userId} accepted on:`, correctionStartDate);
        }
    } else if (paper.status === 'needing corrections') {
        // For authors: 15 days from when the article changed route to "needing corrections"
        // This happens when ALL reviewers have finished their work
        correctionType = 'author';
        
        // Use the specific date when status changed to "needing corrections"
        // This date should NOT change even if the author edits the article
        if (paper.statusChangedToCorrectionsAt) {
            correctionStartDate = new Date(paper.statusChangedToCorrectionsAt);
            console.log('Author correction phase started when status changed to needing corrections (fixed date):', correctionStartDate);
        } else {
            // Fallback to updatedAt if the new field is not yet populated
            correctionStartDate = new Date(paper.updatedAt);
            console.log('Author correction phase started (fallback to updatedAt):', correctionStartDate);
        }
        
    } else if (paper.status === 'in review' && paper.peer_review?.responses) {
        // For papers in review: this is the reviewer correction phase
        // If we have a specific reviewer, use their individual acceptance date
        if (userRole === 'reviewer' && userId) {
            correctionType = 'reviewer';
            const reviewerResponse = paper.peer_review.responses.find(
                response => response.reviewerId._id === userId || response.reviewerId.id === userId
            );
            
            if (reviewerResponse && reviewerResponse.status === 'accepted' && reviewerResponse.responseDate) {
                correctionStartDate = new Date(reviewerResponse.responseDate);
                console.log(`Individual reviewer ${userId} in review phase accepted on:`, correctionStartDate);
            }
        } else {
            // For general view (no specific user), show the earliest acceptance to give an overview
            correctionType = 'reviewer';
            const acceptedReviews = paper.peer_review.responses.filter(
                response => response.status === 'accepted' && response.responseDate
            );
            
            if (acceptedReviews.length > 0) {
                const earliestAcceptance = acceptedReviews.reduce((earliest, response) => {
                    const responseDate = new Date(response.responseDate!);
                    return responseDate < earliest ? responseDate : earliest;
                }, new Date(acceptedReviews[0].responseDate!));
                
                correctionStartDate = earliestAcceptance;
                console.log('Review phase started with earliest acceptance:', correctionStartDate);
            }
        }
    }
    
    console.log('correctionStartDate found:', correctionStartDate);
    console.log('correctionType determined:', correctionType);
    
    // If no start date found or invalid date, return no deadline
    if (!correctionStartDate || correctionStartDate.getTime() === 0 || correctionStartDate.getTime() < new Date('2020-01-01').getTime()) {
        console.log('No valid correction start date found, returning no deadline');
        return {
            hasDeadline: false,
            daysRemaining: null,
            hoursRemaining: null,
            isOverdue: false,
            deadlineDate: null,
            correctionStartDate: null,
            correctionType: null
        };
    }
    
    // Calculate deadline date (15 days after start date)
    const deadlineDate = new Date(correctionStartDate);
    deadlineDate.setDate(deadlineDate.getDate() + CORRECTION_DEADLINE_DAYS);
    
    // Calculate difference
    const now = new Date();
    const timeDifference = deadlineDate.getTime() - now.getTime();
    
    // Calculate remaining days and hours
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(timeDifference / (1000 * 60 * 60));
    
    const isOverdue = timeDifference < 0;
    
    console.log('deadlineDate:', deadlineDate);
    console.log('now:', now);
    console.log('timeDifference:', timeDifference);
    console.log('daysRemaining (raw):', Math.ceil(timeDifference / (1000 * 60 * 60 * 24)));
    console.log('hoursRemaining (raw):', Math.ceil(timeDifference / (1000 * 60 * 60)));
    console.log('isOverdue:', isOverdue);
    
    return {
        hasDeadline: true,
        daysRemaining: isOverdue ? Math.abs(daysRemaining) : daysRemaining,
        hoursRemaining: isOverdue ? Math.abs(hoursRemaining) : hoursRemaining,
        isOverdue,
        deadlineDate,
        correctionStartDate,
        totalDays: CORRECTION_DEADLINE_DAYS,
        correctionType
    };
}

/**
 * Simplified version that automatically detects correction context
 * @param paper - The Paper object
 * @param currentUser - The current user object (optional)
 * @param reviewAssignments - Optional array of ReviewAssignment objects to use custom deadlines
 * @returns Object with information about the remaining time
 */
export function getCorrectionTimeRemainingAuto(paper: Paper, currentUser?: User, reviewAssignments?: any[]) {
    // Sempre priorizar o deadline do ReviewAssignment se existir para o usuário logado
    let userId: string | undefined;
    if (currentUser) {
        userId = currentUser._id || currentUser.id;
        console.log('userId extracted:', userId);
        // Se existe ReviewAssignment para esse paper e user, forçar userRole = 'reviewer'
        if (reviewAssignments && userId) {
            const assignment = reviewAssignments.find(a => {
                const aReviewerId = typeof a.reviewerId === 'object' ? (a.reviewerId._id || a.reviewerId.id) : a.reviewerId;
                const aPaperId = typeof a.paperId === 'object' ? (a.paperId._id || a.paperId.id) : a.paperId;
                return aReviewerId?.toString() === userId && aPaperId?.toString() === paper.id?.toString();
            });
            if (assignment) {
                // Força userRole = 'reviewer' para garantir uso do deadline customizado
                return getCorrectionTimeRemaining(paper, 'reviewer', userId, reviewAssignments);
            }
        }
        // ...código antigo para detectar papel...
        const isMainAuthor = paper.mainAuthor && (paper.mainAuthor._id === userId || paper.mainAuthor.id === userId);
        const isCoAuthor = paper.coAuthors?.some(author => author._id === userId || author.id === userId);
        const isAuthor = isMainAuthor || isCoAuthor;
        const isReviewerInReviewers = paper.reviewers?.some(reviewer => reviewer._id === userId || reviewer.id === userId);
        const isReviewerInResponses = paper.peer_review?.responses?.some(response => 
            response.reviewerId._id === userId || response.reviewerId.id === userId
        );
        const isReviewer = isReviewerInReviewers || isReviewerInResponses;
        let userRole: 'author' | 'reviewer' | undefined;
        if (isAuthor) {
            userRole = 'author';
        } else if (isReviewer) {
            userRole = 'reviewer';
        }
        if (paper.status === 'needing corrections' || paper.status === 'in review' || paper.status === 'under correction') {
            return getCorrectionTimeRemaining(paper, userRole, userId, reviewAssignments);
        }
    }
    
    // Fallback para casos raros
    if (paper.status === 'needing corrections' || paper.status === 'in review' || paper.status === 'under correction') {
        return getCorrectionTimeRemaining(paper, undefined, undefined, reviewAssignments);
    }
    return getCorrectionTimeRemaining(paper, undefined, undefined, reviewAssignments);
}

/**
 * Formats the remaining time for display
 * @param timeInfo - Time information returned by getCorrectionTimeRemaining
 * @returns Formatted string for display
 */
export function formatCorrectionTimeRemaining(timeInfo: ReturnType<typeof getCorrectionTimeRemaining>): string {
    if (!timeInfo.hasDeadline || timeInfo.daysRemaining === null || timeInfo.hoursRemaining === null) {
        return '';
    }
    
    const { daysRemaining, hoursRemaining, isOverdue } = timeInfo;
    
    if (isOverdue) {
        if (daysRemaining > 1) {
            return `⚠️ Deadline exceeded by ${daysRemaining} days`;
        } else {
            return `⚠️ Deadline exceeded by ${hoursRemaining} hours`;
        }
    }
    
    if (daysRemaining > 1) {
        return `⏱️ ${daysRemaining} days remaining`;
    } else if (daysRemaining === 1) {
        return `⏱️ 1 day remaining`;
    } else {
        return `⏱️ ${hoursRemaining} hours remaining`;
    }
}

/**
 * Returns the appropriate CSS class based on remaining time
 * @param timeInfo - Time information returned by getCorrectionTimeRemaining
 * @returns String with CSS classes
 */
export function getCorrectionTimeClass(timeInfo: ReturnType<typeof getCorrectionTimeRemaining>): string {
    if (!timeInfo.hasDeadline || timeInfo.daysRemaining === null) {
        return '';
    }
    
    const { daysRemaining, isOverdue } = timeInfo;
    
    if (isOverdue) {
        return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-l-4 border-red-500 shadow-lg';
    } else if (daysRemaining <= 2) {
        return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-l-4 border-orange-500 shadow-lg';
    } else if (daysRemaining <= 5) {
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-l-4 border-yellow-500 shadow-lg';
    } else {
        return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-l-4 border-green-500 shadow-lg';
    }
}

/**
 * Calculates the progress percentage of the correction deadline
 * @param timeInfo - Time information returned by getCorrectionTimeRemaining
 * @returns Progress percentage (0-100)
 */
export function getCorrectionProgressPercentage(timeInfo: ReturnType<typeof getCorrectionTimeRemaining>): number {
    if (!timeInfo.hasDeadline || !timeInfo.correctionStartDate || !timeInfo.deadlineDate) {
        return 0;
    }
    
    const now = new Date();
    const totalTime = timeInfo.deadlineDate.getTime() - timeInfo.correctionStartDate.getTime();
    const elapsedTime = now.getTime() - timeInfo.correctionStartDate.getTime();
    
    const percentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
    return Math.round(percentage);
}

/**
 * Calcula informações de prazo baseado no sistema de 4 fases
 * @param paper - O objeto Paper
 * @param currentUser - O usuário atual (opcional)
 * @param reviewAssignments - Optional array of ReviewAssignment objects to use custom deadlines
 * @returns Informações sobre o prazo da fase atual
 */
export function getPhaseBasedTimeRemaining(paper: Paper, currentUser?: User, reviewAssignments?: any[]) {
    const currentPhase = getCurrentPhase(paper.status);
    
    if (!currentPhase) {
        return {
            hasDeadline: false,
            phase: null,
            daysRemaining: null,
            hoursRemaining: null,
            isOverdue: false,
            deadlineDate: null,
            phaseStartDate: null,
            phaseName: null,
            phaseDescription: null
        };
    }
    
    const phaseInfo = getPhaseInfo(currentPhase);
    const timestampKey = phaseInfo.timestampKey;
    const phaseStartDate = paper.phaseTimestamps?.[timestampKey];
    
    if (!phaseStartDate) {
        // Fallback para compatibilidade com sistema antigo
        return getCorrectionTimeRemainingAuto(paper, currentUser, reviewAssignments);
    }
    
    // Calcular deadline baseado na duração da fase
    const startDate = new Date(phaseStartDate);
    const deadlineDate = new Date(startDate);
    deadlineDate.setDate(deadlineDate.getDate() + phaseInfo.duration);
    
    // Calcular diferença
    const now = new Date();
    const timeDifference = deadlineDate.getTime() - now.getTime();
    
    // Calcular dias e horas restantes
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(timeDifference / (1000 * 60 * 60));
    const isOverdue = timeDifference < 0;
    
    return {
        hasDeadline: true,
        phase: currentPhase,
        daysRemaining: isOverdue ? Math.abs(daysRemaining) : daysRemaining,
        hoursRemaining: isOverdue ? Math.abs(hoursRemaining) : hoursRemaining,
        isOverdue,
        deadlineDate,
        phaseStartDate: startDate,
        phaseName: phaseInfo.name,
        phaseDescription: phaseInfo.description,
        totalDays: phaseInfo.duration
    };
}

/**
 * Helper function to set the fixed date when paper status changes to "needing corrections"
 * This should be called whenever the paper status is updated to "needing corrections"
 * @param paperId - The ID of the paper
 * @returns Promise that resolves when the date is set
 */
export async function setPaperStatusChangedToCorrections(paperId: string) {
    try {
        const response = await fetch('/api/papers/set-corrections-date', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paperId,
                statusChangedToCorrectionsAt: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.error('Failed to set statusChangedToCorrectionsAt date');
        }
    } catch (error) {
        console.error('Error setting statusChangedToCorrectionsAt date:', error);
    }
}

/**
 * Função para capturar timestamp de fase
 * @param paperId - ID do paper
 * @param phase - Fase que está iniciando
 * @returns Promise que resolve quando o timestamp é definido
 */
export async function capturePhaseTimestamp(paperId: string, phase: ReviewPhase, timestampKey: string) {
    try {
        const response = await fetch('/api/papers/set-phase-timestamp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paperId,
                phase,
                timestampKey,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.error('Failed to set phase timestamp');
        }
    } catch (error) {
        console.error('Error setting phase timestamp:', error);
    }
}

/**
 * Checks if a specific reviewer has an active deadline
 * @param paper - The Paper object
 * @param reviewerId - The ID of the reviewer to check
 * @returns Object with reviewer-specific deadline information
 */
export function getReviewerSpecificDeadline(paper: Paper, reviewerId: string) {
    if (!paper.peer_review?.responses || paper.status !== 'in review') {
        return { hasActiveDeadline: false };
    }
    
    const reviewerResponse = paper.peer_review.responses.find(
        response => response.reviewerId._id === reviewerId || response.reviewerId.id === reviewerId
    );
    
    if (!reviewerResponse || reviewerResponse.status !== 'accepted' || !reviewerResponse.responseDate) {
        return { hasActiveDeadline: false };
    }
    
    const acceptanceDate = new Date(reviewerResponse.responseDate);
    const deadlineDate = new Date(acceptanceDate);
    deadlineDate.setDate(deadlineDate.getDate() + 15);
    
    const now = new Date();
    const timeDifference = deadlineDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    const isOverdue = timeDifference < 0;
    
    return {
        hasActiveDeadline: true,
        acceptanceDate,
        deadlineDate,
        daysRemaining: isOverdue ? Math.abs(daysRemaining) : daysRemaining,
        isOverdue,
        reviewerResponse
    };
}

/**
 * Returns a more detailed time description with visual enhancements
 * @param timeInfo - Time information returned by getCorrectionTimeRemaining
 * @returns Enhanced time description object
 */
export function getEnhancedTimeDescription(timeInfo: ReturnType<typeof getCorrectionTimeRemaining>) {
    console.log('=== getEnhancedTimeDescription DEBUG ===');
    console.log('timeInfo received:', timeInfo);
    
    if (!timeInfo.hasDeadline || timeInfo.daysRemaining === null || timeInfo.hoursRemaining === null) {
        console.log('No deadline or null values, returning null');
        return null;
    }
    
    const { daysRemaining, hoursRemaining, isOverdue, deadlineDate } = timeInfo;
    console.log('Extracted values:', { daysRemaining, hoursRemaining, isOverdue, deadlineDate });
    
    let status: 'overdue' | 'urgent' | 'warning' | 'good' = 'good';
    let icon = '✅';
    let description = '';
    
    if (isOverdue) {
        status = 'overdue';
        icon = '🚨';
        if (daysRemaining > 1) {
            description = `Deadline exceeded by ${daysRemaining} days`;
        } else {
            description = `Deadline exceeded by ${hoursRemaining} hours`;
        }
    } else if (daysRemaining <= 1) {
        status = 'urgent';
        icon = '⚡';
        if (hoursRemaining <= 24) {
            description = `Only ${hoursRemaining} hours remaining`;
        } else {
            description = `Less than 1 day remaining`;
        }
    } else if (daysRemaining <= 3) {
        status = 'warning';
        icon = '⚠️';
        description = `${daysRemaining} days remaining`;
    } else {
        status = 'good';
        icon = '📅';
        description = `${daysRemaining} days remaining`;
    }
    
    const deadlineFormatted = deadlineDate ? deadlineDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';
    
    const result = {
        status,
        icon,
        description,
        deadlineFormatted,
        daysRemaining,
        hoursRemaining,
        isOverdue
    };
    
    console.log('getEnhancedTimeDescription result:', result);
    console.log('==========================================');
    
    return result;
}