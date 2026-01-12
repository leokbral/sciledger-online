import type { User } from './User';
import type { Paper } from './Paper';
import type { Hub } from './Hub';

export type PaperReviewInvitation = {
    _id: string;
    id: string;
    paper: Paper | string;
    reviewer: User | string;
    invitedBy: User | string;
    hubId: Hub | string;
    status: 'pending' | 'accepted' | 'declined';
    customDeadlineDays?: number; // Prazo customizado em dias (padrão 15)
    reviewAssignmentId?: string; // Referência ao ReviewAssignment criado
    invitedAt: Date;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};
