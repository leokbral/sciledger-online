import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import Invitations from '$lib/db/models/Invitation';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) redirect(302, '/login');

	await start_mongo(); // Pode ser removido se a conexão já é iniciada em outro lugar

	// Buscar todos os usuários
	const fetchUsers = async () => {
		return await Users.find({}, {}).lean().exec();
	};

	// Buscar papers disponíveis ou atribuídos ao revisor logado
	const fetchPapers = async () => {
		const papersRaw = await Papers.find({}, {})
			.populate("mainAuthor")
			.populate("coAuthors")
			.populate("correspondingAuthor")
			.populate("hubId")
			.lean()
			.exec();

		// Normalizar estrutura de peer_review
		const normalizedPapers = papersRaw.map((paper) => {
			const peer_review = paper.peer_review
				? {
					reviewType: paper.peer_review.reviewType,
					assignedReviewers: paper.peer_review.assignedReviewers ?? [],
					responses: (paper.peer_review.responses ?? []).map((r: unknown) => ({
						reviewerId: (r as { reviewerId: string }).reviewerId,
						status: (r as { status: string }).status,
						responseDate: (r as { responseDate: string }).responseDate,
						_id: (r as { _id?: { toString?: () => string } })._id?.toString?.()
					})),
					reviews: paper.peer_review.reviews ?? [],
					averageScore: paper.peer_review.averageScore ?? 0,
					reviewCount: paper.peer_review.reviewCount ?? 0,
					reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
				}
				: {
					reviewType: "open",
					assignedReviewers: [],
					responses: [],
					reviews: [],
					averageScore: 0,
					reviewCount: 0,
					reviewStatus: "not_started"
				};

			return {
				...paper,
				peer_review
			};
		});

		// Filtrar papers com menos de 3 revisores aceitos OU revisores que já aceitaram/completaram
		const filteredPapers = normalizedPapers.filter((paper) => {
			const responses = paper.peer_review.responses;
			const acceptedOrCompleted = responses.filter(
				(r) => r.status === 'accepted' || r.status === 'completed'
			);

			// Verifica se o user atual está entre os que aceitaram/completaram
			const isReviewer = acceptedOrCompleted.some(r => r.reviewerId === user.id);

			// Se ainda não tem 3 ou o user é revisor desse paper, então mostra
			return acceptedOrCompleted.length < 3 || isReviewer;
		});

		return filteredPapers;
	};

	// Buscar reviews feitas pelo usuário
	const fetchReviews = async (reviewerId: string) => {
		return await Reviews.find({ reviewer: reviewerId }).lean().exec();
	};

	// Buscar convites de revisão recebidos
	const fetchReviewInvitation = async (reviewerId: string) => {
		const invitations = await Invitations.find({ reviewer: reviewerId }).lean().exec();
		console.log('Invitations5:', invitations);
		return invitations;
	};

	return {
		users: await fetchUsers(),
		papers: await fetchPapers(),
		reviews: await fetchReviews(user.id),
		user,
		reviewerInvitations: await fetchReviewInvitation(user.id)
	};
}
