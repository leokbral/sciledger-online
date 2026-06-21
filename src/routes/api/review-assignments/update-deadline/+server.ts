import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import { emitEvent } from '$lib/services/EventService';
import { authorize } from '$lib/server/authorization/authorizationService';
import type { RequestHandler } from './$types';
import * as crypto from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { reviewAssignmentId, paperId, reviewerId, newDeadlineDays } = await request.json();

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

		const authorization = await authorize(user, 'review.manageDeadlines', { paper });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}

		// Calcular nova deadline
		const newDeadline = new Date(Date.now() + newDeadlineDays * 24 * 60 * 60 * 1000);

		// Buscar ou criar ReviewAssignment
		let reviewAssignment;
		
		if (reviewAssignmentId) {
			// Atualizar ReviewAssignment existente
			reviewAssignment = await ReviewAssignment.findOne({ 
				$or: [{ _id: reviewAssignmentId }, { id: reviewAssignmentId }] 
			});

			if (!reviewAssignment) {
				// Tentar buscar por paperId e reviewerId como fallback
				reviewAssignment = await ReviewAssignment.findOne({
					paperId: paperId,
					reviewerId: reviewerId
				});
				
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
			
			reviewAssignment = updated || reviewAssignment;
		} else {
			// Buscar ReviewAssignment pelo paperId e reviewerId
			reviewAssignment = await ReviewAssignment.findOne({
				paperId: paperId,
				reviewerId: reviewerId
			});

			if (reviewAssignment) {
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
				
				reviewAssignment = updated || reviewAssignment;
			} else {
				// Criar novo ReviewAssignment (caso ainda não exista)
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

				// Atualizar PaperReviewInvitation com a referência
				await PaperReviewInvitation.findOneAndUpdate(
					{
						$or: [
							{ paperId, reviewerId },
							{ paper: paperId, reviewer: reviewerId }
						]
					},
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

		// Notificar o revisor sobre a mudança de deadline
		try {
			await emitEvent({
				type: 'review.assignment.deadline_updated',
				actorId: user.id,
				recipients: [String(reviewerId)],
				entityType: 'review',
				entityId: String(finalCheck?.id || finalCheck?._id || reviewAssignment.id || reviewAssignment._id),
				metadata: {
					paperId,
					paperTitle: paper.title,
					hubId:
						typeof paper.hubId === 'object' && paper.hubId
							? String(paper.hubId._id || paper.hubId.id)
							: paper.hubId
								? String(paper.hubId)
								: null,
					reviewerId: String(reviewerId),
					deadline: newDeadline.toISOString(),
					deadlineDays: newDeadlineDays,
					recipientRoles: {
						[String(reviewerId)]: 'reviewer'
					}
				}
			});
		} catch (eventError) {
			console.error('Failed to emit review deadline updated event:', eventError);
		}

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
