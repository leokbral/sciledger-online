// ReviewType.ts
export type Review = {
    _id: string; // ID da revisão (UUID)
    id: string; // UUID para a revisão
    paper: string; // ID do artigo sendo revisado (referência ao Paper)
    reviewer: string; // ID do revisor (referência ao User)
    reviewType: 'open' | 'selected'; // Tipo de revisão: 'open' ou 'selected'
    score: number; // Pontuação da revisão (0 a 5)
    comments: string; // Comentários fornecidos pelo revisor
    status: 'pending' | 'accepted' | 'rejected' | 'needs_revision'; // Status da revisão
    responseTime: number; // Tempo de resposta da revisão, em dias (opcional)
    assignedAt: string; // Data em que a revisão foi atribuída
    completedAt?: string; // Data em que a revisão foi concluída (opcional)
    feedbackForAuthor?: string; // Feedback do revisor para o autor (opcional)
    feedbackForReviewer?: string; // Feedback do autor para o revisor (opcional)
    isFeedbackAcknowledged: boolean; // Se o feedback foi reconhecido (opcional)
    createdAt: string; // Data de criação da revisão
    updatedAt: string; // Data de atualização da revisão
};
