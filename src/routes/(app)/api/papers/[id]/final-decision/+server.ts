import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { decision, rejectionReason, expectedStatus } = await request.json();
		const paperId = params.id;

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		if (!decision || !['accept', 'reject'].includes(decision)) {
			return json({ error: 'Valid decision (accept/reject) is required' }, { status: 400 });
		}

		const paper: any = await Papers.findOne({
			$or: [{ id: paperId }, { _id: paperId }]
		}).lean();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const finalDecisionAt = new Date();
		const action = decision === 'accept' ? 'paper.accept' : 'paper.reject';
		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId: String(paper.id || paper._id),
			action,
			expectedStatus: expectedStatus || String(paper.status),
			extraSet: {
				finalDecision: decision,
				finalDecisionAt,
				finalDecisionBy: user.id,
				...(decision === 'reject' ? { rejectionReason } : {})
			},
			metadata: {
				endpoint: '/api/papers/[id]/final-decision',
				decision,
				rejectionReason: decision === 'reject' ? rejectionReason : undefined
			}
		});

		const editor = await Users.findOne({ id: user.id }).lean();
		const editorName = `${editor?.firstName || ''} ${editor?.lastName || ''}`.trim();
		const paperTitle = paper.title;
		const authorId = String(paper.author || paper.mainAuthor || paper.createdBy);
		const authorName = paper.authorName || 'Autor';
		const reviewerIds =
			paper.peer_review?.assignedReviewers?.map((id: string | object) => String(id)) || [];

		if (decision === 'accept') {
			await NotificationService.createPaperFinalAcceptanceNotifications({
				paperId: String(paper.id || paper._id),
				paperTitle,
				authorId,
				authorName,
				editorId: String(user.id),
				editorName,
				reviewerIds,
				hubId: paper.hubId ? String(paper.hubId) : undefined,
				hubName: paper.hubName,
				publicationDate: finalDecisionAt
			});
		} else {
			await NotificationService.createPaperFinalRejectionNotifications({
				paperId: String(paper.id || paper._id),
				paperTitle,
				authorId,
				authorName,
				editorId: String(user.id),
				editorName,
				reviewerIds,
				rejectionReason,
				hubId: paper.hubId ? String(paper.hubId) : undefined,
				hubName: paper.hubName
			});
		}

		return json({
			success: true,
			message: `Paper ${decision === 'accept' ? 'accepted' : 'rejected'} successfully`,
			paperId: String(paper.id || paper._id),
			status: updatedPaper.status,
			finalDecision: decision,
			finalDecisionAt
		});
	} catch (error) {
		if (error instanceof EditorialTransitionError) {
			return json(
				{
					success: false,
					error: error.message,
					code: error.code,
					currentStatus: error.currentStatus
				},
				{ status: error.status }
			);
		}

		console.error('Error making final decision:', error);
		return json(
			{
				success: false,
				error: 'Failed to make final decision',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
