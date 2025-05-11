import type { User } from "./User";

export type Paper = {
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
    paperPictures: string[]; // Alterado de articlePictures para paperPictures
    citations: string[]; // Lista de citações como UUIDs
    likes: string[]; // Lista de usuários que curtiram como UUIDs
    comments: string[]; // Lista de comentários como UUIDs
    tags: string[];
    status: string;
    price: number;
    score: number;
    authors: User[],
	peer_review: string,
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
    hubId?: string | null;
    isLinkedToHub?: boolean
}