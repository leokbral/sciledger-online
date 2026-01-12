import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { reviewAssignmentId, paperId, reviewerId, newDeadlineDays } = await request.json();

		console.log('🔄 Update Deadline Request:', { reviewAssignmentId, paperId, reviewerId, newDeadlineDays });

		if (!paperId || !reviewerId || !newDeadlineDays) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		if (newDeadlineDays < 1 || newDeadlineDays > 90) {
			return json({ error: 'Deadline must be between 1 and 90 days' }, { status: 400 });
		}

		// Importar dinamicamente para evitar problemas de tipo
		const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;

		// Buscar o paper
		const paper = await Papers.findOne({ id: paperId }).populate('hubId');
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		// Verificar se o usuário é o dono do hub (apenas hub owners podem alterar deadlines)
		const hubCreatorId = typeof paper.hubId === 'object'
			? (paper.hubId?.createdBy?._id || paper.hubId?.createdBy?.id || paper.hubId?.createdBy)
			: null;
		
		if (hubCreatorId?.toString() !== user.id) {
			return json({ error: 'Only hub owner can manage review deadlines' }, { status: 403 });
		}

		// Calcular nova deadline
		const newDeadline = new Date(Date.now() + newDeadlineDays * 24 * 60 * 60 * 1000);
		console.log('📅 New deadline calculated:', newDeadline);

		// Buscar ou criar ReviewAssignment
		let reviewAssignment;
		
		if (reviewAssignmentId) {
			console.log('🔍 Searching by reviewAssignmentId:', reviewAssignmentId);
			// Atualizar ReviewAssignment existente
			reviewAssignment = await ReviewAssignment.findOne({ 
				$or: [{ _id: reviewAssignmentId }, { id: reviewAssignmentId }] 
			});

			console.log('📦 Found assignment by ID:', reviewAssignment ? 'YES' : 'NO');
			if (reviewAssignment) {
				console.log('📦 Assignment before update:', { 
					deadline: reviewAssignment.deadline, 
					_id: reviewAssignment._id, 
					id: reviewAssignment.id,
					paperId: reviewAssignment.paperId,
					reviewerId: reviewAssignment.reviewerId
				});
			}

			if (!reviewAssignment) {
				// Tentar buscar por paperId e reviewerId como fallback
				console.log('⚠️ Assignment not found by ID, trying by paper/reviewer');
				reviewAssignment = await ReviewAssignment.findOne({
					paperId: paperId,
					reviewerId: reviewerId
				});
				console.log('📦 Found by fallback:', reviewAssignment ? 'YES' : 'NO');
				
				if (!reviewAssignment) {
					return json({ error: 'Review assignment not found' }, { status: 404 });
				}
			}

			// Usar findOneAndUpdate para garantir que persista
			const updateQuery = reviewAssignment._id ? { _id: reviewAssignment._id } : { id: reviewAssignment.id };
			const updated = await ReviewAssignment.findOneAndUpdate(
				updateQuery,
				{ 
					$set: { 
						deadline: newDeadline,
						updatedAt: new Date()
					}
				},
				{ new: true } // Retorna o documento atualizado
			);
			
			console.log('✅ Assignment updated with findOneAndUpdate:', { 
				deadline: updated?.deadline, 
				_id: updated?._id,
				updatedAt: updated?.updatedAt
			});
			
			reviewAssignment = updated || reviewAssignment;
		} else {
			console.log('🔍 Searching by paperId and reviewerId:', { paperId, reviewerId });
			// Buscar ReviewAssignment pelo paperId e reviewerId
			reviewAssignment = await ReviewAssignment.findOne({
				paperId: paperId,
				reviewerId: reviewerId
			});

			console.log('📦 Found assignment by paper/reviewer:', reviewAssignment ? 'YES' : 'NO');

			if (reviewAssignment) {
				console.log('📦 Assignment before update:', { deadline: reviewAssignment.deadline, _id: reviewAssignment._id, id: reviewAssignment.id });
				
				// Usar findOneAndUpdate para garantir que persista
				const updateQuery = reviewAssignment._id ? { _id: reviewAssignment._id } : { id: reviewAssignment.id };
				const updated = await ReviewAssignment.findOneAndUpdate(
					updateQuery,
					{ 
						$set: { 
							deadline: newDeadline,
							updatedAt: new Date()
						}
					},
					{ new: true }
				);
				
				console.log('✅ Assignment updated:', { 
					deadline: updated?.deadline,
					_id: updated?._id
				});
				
				reviewAssignment = updated || reviewAssignment;
			} else {
				// Criar novo ReviewAssignment (caso ainda não exista)
				console.log('🆕 Creating new ReviewAssignment');
				const assignmentId = crypto.randomUUID();
				reviewAssignment = new ReviewAssignment({
					_id: assignmentId,
					id: assignmentId,
					paperId: paperId,
					reviewerId: reviewerId,
					status: 'accepted',
					assignedAt: new Date(),
					acceptedAt: new Date(),
					deadline: newDeadline,
					hubId: typeof paper.hubId === 'object' && paper.hubId ? (paper.hubId._id || paper.hubId.id) : paper.hubId || undefined,
					isLinkedToHub: !!paper.hubId
				});
				await reviewAssignment.save();
				console.log('✅ New assignment created:', { _id: reviewAssignment._id, deadline: reviewAssignment.deadline });

				// Atualizar PaperReviewInvitation com a referência
				await PaperReviewInvitation.findOneAndUpdate(
					{ paper: paperId, reviewer: reviewerId },
					{ reviewAssignmentId: assignmentId }
				);
			}
		}

		// Verificação final: buscar o documento atualizado do banco
		const finalCheck = await ReviewAssignment.findOne({
			$or: [
				{ _id: reviewAssignment._id },
				{ id: reviewAssignment.id },
				{ paperId: paperId, reviewerId: reviewerId }
			]
		});
		console.log('🔍 Final verification from DB:', {
			found: !!finalCheck,
			deadline: finalCheck?.deadline,
			_id: finalCheck?._id,
			id: finalCheck?.id
		});

		// Notificar o revisor sobre a mudança de deadline
		await NotificationService.createNotification({
			user: String(reviewerId),
			type: 'system',
			title: 'Review Deadline Updated',
			content: `The deadline for reviewing "${paper.title}" has been updated to ${newDeadline.toLocaleDateString()}`,
			relatedPaperId: paperId,
			relatedHubId: typeof paper.hubId === 'object' && paper.hubId ? String(paper.hubId._id || paper.hubId.id) : (paper.hubId ? String(paper.hubId) : undefined),
			actionUrl: `/review/inreview/${paperId}`,
			priority: 'medium',
			metadata: {
				paperTitle: paper.title,
				newDeadline: newDeadline.toISOString(),
				deadlineDays: newDeadlineDays
			}
		});

		return json({
			success: true,
			message: 'Review deadline updated successfully',
			deadline: newDeadline,
			reviewAssignmentId: reviewAssignment._id || reviewAssignment.id
		});
	} catch (error) {
		console.error('Error updating review deadline:', error);
		return json({ error: 'Failed to update review deadline' }, { status: 500 });
	}
};
