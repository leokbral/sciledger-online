import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { hubId } = params;

		// Verificar se o usuário é o dono do hub
		const hub = await Hubs.findById(hubId);
		if (!hub) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const hubCreatorId = hub.createdBy?.toString();
		if (hubCreatorId !== user.id) {
			return json({ error: 'Only hub owner can create review assignments' }, { status: 403 });
		}

		// Importar ReviewAssignment dinamicamente
		const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;

		// Buscar todos os papers deste hub
		const papers = await Papers.find({ 
			hubId: hubId,
			reviewers: { $exists: true, $ne: [] }
		}).lean();

		let createdCount = 0;

		// Para cada paper, verificar revisores e criar ReviewAssignments se não existirem
		for (const paper of papers) {
			if (!paper.reviewers || paper.reviewers.length === 0) continue;

			for (const reviewerId of paper.reviewers) {
				// Verificar se já existe ReviewAssignment
				const existing = await ReviewAssignment.findOne({
					paperId: paper.id,
					reviewerId: reviewerId
				});

				if (!existing) {
					// Criar ReviewAssignment
					const assignmentId = crypto.randomUUID();
					const now = new Date();
					const deadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 dias padrão

					await ReviewAssignment.create({
						_id: assignmentId,
						id: assignmentId,
						paperId: paper.id,
						reviewerId: reviewerId,
						status: 'accepted',
						assignedAt: now,
						acceptedAt: now,
						deadline: deadline,
						hubId: hubId,
						isLinkedToHub: true
					});

					createdCount++;
					console.log(`✅ Created ReviewAssignment for reviewer ${reviewerId} on paper ${paper.id}`);
				}
			}
		}

		return json({
			success: true,
			created: createdCount,
			message: `Successfully created ${createdCount} review assignment(s)`
		});
	} catch (error) {
		console.error('Error creating review assignments:', error);
		return json({ error: 'Failed to create review assignments' }, { status: 500 });
	}
};
