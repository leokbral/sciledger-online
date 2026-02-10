import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	const userId = locals.user.id;

	try {
		console.log('[PapersPool] Loading paper:', params.slug);
		
		const paperRaw = await Papers.findOne({ id: params.slug })
			.populate("authors")
			.populate("mainAuthor")
			.populate("coAuthors")
			.populate("reviewers")
			.populate("hubId")
			.lean()
			.exec();

		if (!paperRaw) throw error(404, "Paper não encontrado");

		console.log('[PapersPool] Paper found, checking permissions...');

		// Verificar permissões: revisor do hub ou dono do hub
		let isHubReviewer = false;
		let isHubOwner = false;
		
		if (paperRaw.hubId && typeof paperRaw.hubId === 'object') {
			// Verificar se é revisor do hub - suporta IDs como objetos ou strings
			if (Array.isArray(paperRaw.hubId.reviewers)) {
				isHubReviewer = paperRaw.hubId.reviewers.some((reviewerId: any) => {
					const id = reviewerId?._id || reviewerId?.id || reviewerId;
					return id?.toString() === userId;
				});
			}
			
			// Verificar se é dono do hub
			const hubCreatorId = paperRaw.hubId.createdBy?._id || 
								 paperRaw.hubId.createdBy?.id || 
								 paperRaw.hubId.createdBy;
			if (hubCreatorId) {
				isHubOwner = hubCreatorId.toString() === userId;
			}
		}

		// Verificar se aceitou via ReviewQueue (novo sistema)
		const ReviewQueue = (await import('$lib/db/models/ReviewQueue')).default;
		const hasAcceptedViaQueue = await ReviewQueue.findOne({
			paperId: params.slug,
			reviewer: userId,
			status: 'accepted'
		}).lean();

		// Para papers "under negotiation" sem hub, qualquer revisor pode ver
		const isOpenReviewer = !paperRaw.hubId && locals.user.roles?.reviewer === true;

		console.log('[PapersPool] Permissions:', { isHubReviewer, isHubOwner, isOpenReviewer, hasAcceptedViaQueue: !!hasAcceptedViaQueue });

		if (!isHubReviewer && !isHubOwner && !isOpenReviewer && !hasAcceptedViaQueue) {
			throw error(403, 'You do not have permission to view this paper');
		}

	// 🔧 Normaliza o campo peer_review (se existir)
	const peer_review = paperRaw.peer_review
		? {
			reviewType: paperRaw.peer_review.reviewType,
			assignedReviewers: paperRaw.peer_review.assignedReviewers ?? [],
			responses: (paperRaw.peer_review.responses ?? []).map((r) => ({
				reviewerId: r.reviewerId,
				status: r.status,
				responseDate: r.responseDate,
				_id: r._id?.toString?.() ?? undefined
			})),
			reviews: paperRaw.peer_review.reviews ?? [],
			averageScore: paperRaw.peer_review.averageScore ?? 0,
			reviewCount: paperRaw.peer_review.reviewCount ?? 0,
			reviewStatus: paperRaw.peer_review.reviewStatus ?? 'not_started'
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

	// Converter para JSON puro para evitar problemas de serialização com ObjectIds
	const paperData = JSON.parse(JSON.stringify({
		...paperRaw,
		peer_review
	}));

	const usersData = await Users.find({}, {}).lean().exec();
	const users = JSON.parse(JSON.stringify(usersData));

	console.log('[PapersPool] Successfully loaded paper');
	return {
		paper: paperData,
		users
	};
	} catch (err: any) {
		console.error('[PapersPool] Error:', err);
		console.error('[PapersPool] Stack:', err?.stack);
		
		// Se já é um erro do SvelteKit, apenas repassa
		if (err?.status) throw err;
		
		// Caso contrário, cria um erro 500
		throw error(500, `Failed to load paper: ${err?.message || 'Unknown error'}`);
	}
};