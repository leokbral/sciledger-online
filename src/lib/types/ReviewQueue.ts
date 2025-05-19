import type { User } from './User';

export type ReviewQueue = {
    _id: string; // ID da fila (usado pelo Mongoose para identificador primário)
    id: string; // ID único gerado, por exemplo, usando uuid
    paperId: string; // ID do paper relacionado à revisão
    reviewer: User; // Revisor único para essa solicitação
    peerReviewType: 'open' | 'selected'; // Tipo de revisão
    hubId?: string; // ID do hub, se aplicável
    isLinkedToHub: boolean; // Indica se está vinculado a um hub
    status: 'pending' | 'accepted' | 'declined'; // Status da resposta do revisor
    assignedAt: Date; // Quando foi designado
    respondedAt?: Date; // Quando respondeu (se aplicável)
    createdAt: Date;
    updatedAt: Date;
};
