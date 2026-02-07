import type { Hub } from "./Hub";
import type { User } from "./User";
import type { Review } from "./Review";

export type Paper = {
    _id: string; // ID interno do MongoDB
    id: string; // ID único gerado para o paper
    mainAuthor: User; // Autor principal como UUID
    correspondingAuthor: User; // Autor correspondente como UUID
    coAuthors: User[]; // Lista de coautores como UUIDs
    reviewers: User[]; // Lista de revisores como UUIDs
    title: string;
    abstract: string;
    keywords: string[];
    content: string;
    pdfUrl: string;
    doi?: string;
    paperPictures: string[]; // Alterado de articlePictures para paperPictures
    citations: string[]; // Lista de citações como UUIDs
    likes: string[]; // Lista de usuários que curtiram como UUIDs
    comments: string[]; // Lista de comentários como UUIDs
    tags: string[];
    status: string;
    price: number;
    score: number;
    authors: User[],
    peer_review?: {
        reviewType: 'open' | 'selected';
        assignedReviewers: User[];
        responses: Array<{
			_id: string;
            reviewerId: User;
            status: 'pending' | 'accepted' | 'declined' | 'completed';
            responseDate?: Date;
            assignedAt?: Date;
            completedAt?: Date;
            reviewId?: string;
        }>;
        // Adicionar campos relacionados às reviews
        reviews: Review[]; // Lista de reviews associadas
        averageScore: number; // Média das avaliações
        reviewCount: number; // Número de reviews completadas
        reviewStatus: 'not_started' | 'in_progress' | 'completed';
    };

    /*  peer_review: {
         reviewType: 'open' | 'selected'; // Tipo de revisão: 'open' para qualquer revisor, 'selected' para revisores específicos
         assignedReviewers: User[]; // Lista de revisores específicos se 'selected'
         reviewerResponses: {
             reviewerId: User; // UUID do revisor
             counterProposal?: string; // Proposta de contraproposta do revisor (opcional)
             responseStatus: 'accepted' | 'declined' | 'counter-proposal' | 'pending'; // Status geral da resposta do revisor
             reviewerComments: string[]; // Comentários do revisor
         }[];
     }; */
    createdAt: Date;
    updatedAt: Date;
    submittedBy: User; // Campo adicionado para quem submeteu o paper
    hubId?: string | Hub| null;
    isLinkedToHub?: boolean;
    correctionProgress?: Record<string, boolean>; // Progresso das correções (checklist)
    
    // Sistema de Slots de Revisão (máximo 3 revisores)
    reviewSlots?: Array<{
        slotNumber: number; // 1, 2, ou 3
        reviewerId: string | User | null; // ID do revisor que ocupa o slot (null se vazio)
        status: 'available' | 'pending' | 'occupied' | 'declined'; // Status do slot
        invitedAt?: Date; // Quando o convite foi enviado
        acceptedAt?: Date; // Quando o revisor aceitou
        declinedAt?: Date; // Quando o revisor recusou
    }>;
    maxReviewSlots?: number; // Número máximo de slots (padrão: 3)
    availableSlots?: number; // Slots disponíveis (calculado)
    reviewRound?: number; // Track which review round (1 = first, 2 = after corrections)
    phaseTimestamps?: {
        round1Start?: Date;
        round1End?: Date;
        correctionStart?: Date;
        correctionEnd?: Date;
        round2Start?: Date;
        round2End?: Date;
    };
    scopusArea?: string; // Scopus subject area (deprecated - use scopusClassifications)
    scopusSubArea?: string; // Scopus subject sub-area (deprecated - use scopusClassifications)
    scopusClassifications?: Array<{
        area: string; // Scopus subject area
        subArea: string; // Scopus subject sub-area
    }>; // Multiple Scopus classifications for interdisciplinary papers
    rejectedByHub?: boolean; // Paper rejected by hub admin
    rejectionReason?: string; // Reason for rejection
    rejectedAt?: Date; // When it was rejected
    rejectedBy?: User | string; // Who rejected it
}