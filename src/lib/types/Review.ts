// ReviewType.ts
export type Review = {
    _id: string; // ID interno do MongoDB
	id: string; // UUID gerado para identificação única da revisão

	paper: string; // ID do artigo sendo avaliado
	reviewer: string; // ID do revisor responsável pela avaliação

	reviewType: 'open' | 'selected'; // Tipo de revisão: aberta para todos ou com revisores designados

	// Avaliação por critérios técnicos
	technicalCorrectness?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Correção técnica do conteúdo
	novelty?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Inovação e originalidade do trabalho
	figuresQuality?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Qualidade das figuras e ilustrações
	experimentalQuality?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Confiabilidade e qualidade experimental
	reproducibility?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Facilidade de reproduzir os resultados
	importance?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Importância e impacto potencial da pesquisa
	clarity?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Clareza do texto e organização
	length?: 'Too Short' | 'Acceptable' | 'Too Long'; // Tamanho do artigo em relação ao conteúdo
	generalOverview?: 'Excellent' | 'Good' | 'Acceptable' | 'Fair' | 'Very Poor'; // Avaliação geral qualitativa

	recommendation: 'Accept' | 'Weak accept' | 'Indifferent' | 'Weak reject' | 'Reject'; // Recomendação final do revisor

	commentsToAuthor: string; // Comentários visíveis ao autor, explicando a decisão
	confidentialComments?: string; // Comentários privados destinados apenas aos editores

	score?: number; // Pontuação numérica geral (0–5)
	comments?: string; // Comentário geral do revisor

	status: 'pending' | 'accepted' | 'rejected' | 'needs_revision'; // Estado atual da revisão

	responseTime?: number; // Tempo (em dias) que o revisor levou para enviar a revisão
	assignedAt?: string; // Data de atribuição da revisão
	completedAt?: string; // Data em que a revisão foi finalizada

	feedbackForAuthor?: string; // Feedback pós-submissão dado pelo editor ao autor
	feedbackForReviewer?: string; // Feedback para o revisor, dado pelo autor ou editor
	isFeedbackAcknowledged?: boolean; // Indica se o revisor ou autor visualizou/aceitou o feedback

	createdAt: string; // Data de criação do registro
	updatedAt: string; // Data da última atualização do registro
};
