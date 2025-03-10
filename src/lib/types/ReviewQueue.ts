import type { User } from './User';

export type ReviewQueue = {
    paperId: string; // ID do paper relacionado à revisão
    assignedReviewers: User[]; // Lista de revisores (referência para o modelo 'User')
    peerReviewType: 'open' | 'selected'; // Tipo de revisão ('open' para todos ou 'selected' para revisores específicos)
    status: 'pending' | 'accepted' | 'rejected'; // Status da fila de revisão
    assignedAt: Date; // Data em que o revisor foi atribuído
}
