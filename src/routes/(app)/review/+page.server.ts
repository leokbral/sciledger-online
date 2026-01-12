import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import Invitations from '$lib/db/models/Invitation';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// Sanitize function to convert ObjectId and Date to strings
function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}
	
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	}
	
	if (obj && typeof obj === 'object') {
		// Handle MongoDB ObjectId
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}
		
		// Handle Date objects
		if (obj instanceof Date) {
			return obj.toISOString();
		}
		
		// Handle regular objects
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = (obj as Record<string, unknown>)[key];
				clean[key] = sanitize(value);
			}
		}
		return clean;
	}
	
	return obj;
}

export async function load({ locals }) {
	try {
		const user = locals.user;
		if (!user) redirect(302, '/login');

		await start_mongo(); // Pode ser removido se a conexão já é iniciada em outro lugar

	// Buscar todos os usuários
	const fetchUsers = async () => {
		return await Users.find({}, {}).lean().exec();
	};

	// Buscar papers disponíveis ou atribuídos ao revisor logado
	const fetchPapers = async () => {
		// Primeiro, buscar papers da ReviewQueue aceitos pelo revisor
		const ReviewQueue = (await import('$lib/db/models/ReviewQueue')).default;
		const acceptedReviews = await ReviewQueue.find({ 
			reviewer: user.id, 
			status: 'accepted' 
		}).lean().exec();

		// Extrair os paperIds aceitos
		const acceptedPaperIds = acceptedReviews.map(r => r.paperId);

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
				peer_review,
				isAcceptedForReview: acceptedPaperIds.includes(paper.id)
			};
		});

		// Filtrar papers com base no status e envolvimento do usuário
		const filteredPapers = normalizedPapers.filter((paper) => {
			try {
				// NOVO: Paperspool só mostra papers SEM hub associado
				// Papers de hub devem ser visualizados na página do hub
				if (paper.hubId) {
					return false;
				}

				const userId = user.id;
			const responses = paper.peer_review.responses;
			const acceptedOrCompleted = responses.filter(
				(r) => r.status === 'accepted' || r.status === 'completed'
			);

			// Verifica se o user é autor/coautor/submitter do paper
			const mainAuthorId = typeof paper.mainAuthor === 'object' 
				? (paper.mainAuthor._id || paper.mainAuthor.id) 
				: paper.mainAuthor;
			const correspondingAuthorId = typeof paper.correspondingAuthor === 'object'
				? (paper.correspondingAuthor._id || paper.correspondingAuthor.id)
				: paper.correspondingAuthor;
			const submittedById = typeof paper.submittedBy === 'object'
				? (paper.submittedBy._id || paper.submittedBy.id)
				: paper.submittedBy;
			
			const isMainAuthor = mainAuthorId?.toString() === userId;
			const isCorrespondingAuthor = correspondingAuthorId?.toString() === userId;
			const isSubmitter = submittedById?.toString() === userId;
			const isCoAuthor = paper.coAuthors?.some((author: any) => {
				const authorId = typeof author === 'object' ? (author._id || author.id) : author;
				return authorId?.toString() === userId;
			});
			const isPaperAuthor = isMainAuthor || isCorrespondingAuthor || isSubmitter || isCoAuthor;

			// Verifica se o user é dono do hub ou revisor do hub
			const hubCreatorId = typeof paper.hubId === 'object'
				? (paper.hubId?.createdBy?._id || paper.hubId?.createdBy?.id || paper.hubId?.createdBy)
				: null;
			const isHubOwner = hubCreatorId?.toString() === userId;
			
			const isHubReviewer = typeof paper.hubId === 'object' && 
				Array.isArray(paper.hubId?.reviewers) && 
				paper.hubId?.reviewers?.includes(userId);

			// Verifica se o user é revisor designado do paper
			const isReviewer = acceptedOrCompleted.some(r => r.reviewerId === userId);

			// Verifica se o user aceitou revisar este paper via ReviewQueue
			const hasAcceptedReview = paper.isAcceptedForReview;

			// Para papers "in review" ou "needing corrections": 
			// só mostra se for revisor designado, revisor do hub, dono do hub ou aceitou via ReviewQueue
			if (paper.status === 'in review' || paper.status === 'needing corrections') {
				return isReviewer || isHubReviewer || isHubOwner || hasAcceptedReview;
			}

			// Para papers "published": só mostra se completou a revisão
			if (paper.status === 'published') {
				const hasCompleted = responses.some(
					r => r.reviewerId === userId && r.status === 'completed'
				);
				return hasCompleted;
			}

			// Para papers "under negotiation": mostra se ainda não tem 3 revisores, se já é revisor, se é revisor do hub ou aceitou via ReviewQueue
			if (paper.status === 'under negotiation') {
				return acceptedOrCompleted.length < 3 || isReviewer || isHubReviewer || hasAcceptedReview;
			}

				// Outros status: não mostra
				return false;
			} catch (err) {
				console.error('Error filtering paper:', paper._id, err);
				return false;
			}
		});

		return filteredPapers.map(sanitizePaper);
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

	// Buscar ReviewAssignments do revisor para obter deadlines customizados
	const fetchReviewerAssignments = async (reviewerId: string) => {
		const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;
		const assignments = await ReviewAssignment.find({
			reviewerId: reviewerId,
			status: { $in: ['accepted', 'pending'] }
		}).lean().exec();
		
		console.log(`📋 Found ${assignments.length} ReviewAssignments for reviewer ${reviewerId}`);
		
		// Converter para formato serializável
		return assignments.map(a => ({
			_id: a._id,
			id: a.id,
			paperId: a.paperId,
			reviewerId: a.reviewerId,
			status: a.status,
			deadline: a.deadline,
			hubId: a.hubId,
			assignedAt: a.assignedAt,
			acceptedAt: a.acceptedAt,
			updatedAt: a.updatedAt
		}));
	};

		return {
			users: sanitize(await fetchUsers()),
			papers: sanitize(await fetchPapers()),
			reviews: sanitize(await fetchReviews(user.id)),
			user: sanitize(user),
			reviewerInvitations: sanitize(await fetchReviewInvitation(user.id)),
			reviewAssignments: sanitize(await fetchReviewerAssignments(user.id))
		};
	} catch (err) {
		console.error('Error loading review page:', err);
		throw err;
	}
}
