import type { Paper } from "./Paper";

export type User = {
	_id: string; // ID interno do MongoDB
	id: string; // ID único gerado para o usuário
    //name: string; // Nome do usuário
    firstName: string; 
    lastName: string; 
    country: string; 
    dob: string;
    username: string; // Handle do usuário, similar ao @username do Twitter
    email: string; // Email do usuário
    password: string; // Senha do usuário
    refreshToken?: string; // Token para gerenciar sessões de login
    resetPasswordToken: string;
    resetPasswordExpiry: string; // Expiração do token de recuperação de senha
    emailVerified: boolean; // Verificação de email
    darkMode: boolean; // Tema escuro
    roles: {
        author: boolean; // Se o usuário é um autor
        reviewer: boolean; // Se o usuário é um revisor
    };
    bio?: string; // Biografia do usuário
    profilePictureUrl?: string; // URL da foto de perfil
    institution?: string; // Instituição de ensino associada ao usuário
    position?: string; // Cargo do usuário
    performanceReviews?: {
        averageReviewDays?: number; // Média de dias de revisão
        recommendations?: string[]; // Recomendações recebidas
        responseTime?: number; // Tempo médio de resposta (em horas, por exemplo)
        expertise?: string[]; // Áreas de expertise do usuário
    };
    connections: string[]; // IDs dos usuários conectados
    followers: User[]; // IDs dos seguidores
    following: User[]; // IDs dos usuários seguidos
    papers: Paper[]; // IDs das publicações do usuário
    hubs?: string[]; // IDs dos hubs associados ao usuário
    createdAt: Date; // Data de criação
    updatedAt: Date; // Data de atualização
};