import type { User } from "./User";
import type { Paper } from "./Paper";

// ReviewType.ts
export type Review = {
    _id: string; // ID interno do MongoDB
	id: string; // UUID gerado para identificação única da revisão

	paperId: Paper | string; // ID do artigo sendo avaliado
	reviewerId: User | string; // ID do revisor responsável pela avaliação
	paperTitle: string; // Título do artigo

	// Parte I – Avaliação Quantitativa (notas de 1 a 5)
	quantitativeEvaluation: {
		originality: number; // Originalidade
		clarity: number; // Clareza
		literatureReview: number; // Revisão da literatura
		theoreticalFoundation: number; // Fundamentação teórica
		methodology: number; // Metodologia
		reproducibility: number; // Reproduzibilidade
		results: number; // Resultados
		figures: number; // Figuras
		limitations: number; // Limitações
		language: number; // Linguagem
		impact: number; // Impacto
	};

	// Parte II – Avaliação Qualitativa
	qualitativeEvaluation: {
		strengths: string; // Pontos fortes
		weaknesses: string; // Pontos fracos
	};

	// Parte III – Ética
	ethics: {
		involvesHumanResearch: 'yes' | 'no' | ''; // Envolve pesquisa com humanos?
		ethicsApproval?: 'adequate' | 'justified' | 'absent' | ''; // Aprovação ética
	};

	// Parte IV – Recomendação
	recommendation: 'accept_without_changes' | 'accept_with_minor_revisions' | 'major_revision' | 'reject' | '';

	// Campos calculados
	averageScore: number; // Pontuação média
	weightedScore: number; // Pontuação ponderada

	// Status e metadados
	status: 'draft' | 'submitted' | 'completed'; // Estado da revisão
	submissionDate?: Date; // Data de submissão
	completionDate?: Date; // Data de conclusão
	createdAt: Date; // Data de criação do registro
	updatedAt: Date; // Data da última atualização do registro
};

export type ReviewCriteria = {
	name: keyof Review['quantitativeEvaluation']; // Nome do critério
	title: string; // Título do critério
	description: string; // Descrição do critério
	options: string[]; // Opções disponíveis para o critério
	weight: string; // Peso do critério na avaliação
};
