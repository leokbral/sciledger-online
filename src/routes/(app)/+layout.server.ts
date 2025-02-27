export function load({ locals }) {
	// console.log('chamou layout home ---> locals = ', locals)
	return {
		user: locals.user && {
			// username: locals.user.firstName,
			username: locals.user.username,
			email: locals.user.email,
			//image: locals.user.profilePictureUrl,
			bio: locals.user.bio,
			//
			id: locals.user.id, // ID único gerado para o usuário
			firstName: locals.user.firstName,
			lastName: locals.user.lastName,
			country: locals.user.country,
			dob: locals.user.dob,
			password: locals.user.password,// Senha do usuário
			refreshToken: locals.user.refreshToken,// Token para gerenciar sessões de login
			darkMode: locals.user.darkMode, // Tema escuro
			roles: {
				author: locals.user.roles.author, // Se o usuário é um autor
				reviewer: locals.user.roles.reviewer, // Se o usuário é um revisor
			},
			profilePictureUrl: locals.user.profilePictureUrl,// URL da foto de perfil
			institution: locals.user.institution,// Instituição de ensino associada ao usuário
			position: locals.user.position,// Cargo do usuário
			performanceReviews: {
				averageReviewDays: locals.user.performanceReviews.averageReviewDays, // Média de dias de revisão
				recommendations: locals.user.performanceReviews.recommendations, // Recomendações recebidas
				responseTime: locals.user.performanceReviews.responseTime, // Tempo médio de resposta (em horas, por exemplo)
				expertise: locals.user.performanceReviews.expertise, // Áreas de expertise do usuário
			},
			connections: locals.user.connections,// IDs dos usuários conectados
			followers: locals.user.followers,// IDs dos seguidores
			following: locals.user.following,// IDs dos usuários seguidos
			papers: locals.user.papers,// IDs das publicações do usuário
			createdAt: locals.user.createdAt, // Data de criação
			updatedAt: locals.user.updatedAt, // Data de atualização
		}
	};
}