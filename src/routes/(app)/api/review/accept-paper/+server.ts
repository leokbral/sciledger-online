import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';
import { PaperLifecycleEmailService } from '$lib/services/PaperLifecycleEmailService';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { paperId, hubId, reviewType = 'peer_review', expectedStatus } = await request.json();

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paper: any = await Papers.findOne({
			$or: [{ id: String(paperId) }, { _id: String(paperId) }]
		}).lean();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId: String(paper.id || paper._id),
			action: 'paper.sendToReview',
			expectedStatus: expectedStatus || String(paper.status),
			extraSet: {
				acceptedAt: new Date(),
				acceptedBy: user.id,
				reviewType
			},
			metadata: {
				endpoint: '/api/review/accept-paper',
				reviewType
			}
		});

		const editor = await Users.findOne({ id: user.id }).lean();
		const editorName = `${editor?.firstName || ''} ${editor?.lastName || ''}`.trim();
		const reviewerIds = paper.peer_review?.assignedReviewers || [];
		const authorId = paper.author || paper.createdBy || paper.mainAuthor;

		await NotificationService.createPaperAcceptedForReviewNotifications({
			paperId: String(paper.id || paper._id),
			paperTitle: paper.title,
			authorId: String(authorId),
			authorName: paper.authorName || 'Autor',
			reviewerIds: reviewerIds.map((id: string) => String(id)),
			editorName,
			hubId: hubId ? String(hubId) : paper.hubId ? String(paper.hubId) : undefined,
			hubName: paper.hubName
		});

		if (paper.coAuthors && Array.isArray(paper.coAuthors)) {
			for (const coAuthorId of paper.coAuthors) {
				if (coAuthorId !== user.id && coAuthorId !== authorId) {
					await NotificationService.createNotification({
						user: String(coAuthorId),
						type: 'paper_accepted_for_review',
						title: 'Artigo aceito para revisao',
						content: `O artigo "${paper.title}" foi aceito para revisao por ${editorName}`,
						relatedPaperId: String(paper.id || paper._id),
						relatedHubId: hubId ? String(hubId) : paper.hubId ? String(paper.hubId) : undefined,
						actionUrl: `/papers/${paper.id || paper._id}`,
						priority: 'high',
						metadata: {
							paperTitle: paper.title,
							editorName,
							acceptedAt: new Date()
						}
					});
				}
			}
		}

		try {
			const authorIds = [
				String(paper.mainAuthor || ''),
				String(paper.correspondingAuthor || ''),
				String(paper.submittedBy || ''),
				...((paper.coAuthors || []).map((id: string) => String(id)))
			].filter(Boolean);

			await PaperLifecycleEmailService.sendPaperAcceptedEmail({
				paperId: String(paper.id || paper._id),
				paperTitle: String(paper.title || 'Paper sem titulo'),
				authorIds,
				acceptedByName: editorName || undefined,
				acceptanceType: 'review'
			});
		} catch (emailError) {
			console.error('Failed to send acceptance-for-review email:', emailError);
		}

		return json({
			success: true,
			message: 'Paper accepted for review successfully',
			paperId: String(paper.id || paper._id),
			status: updatedPaper.status,
			notificationsCreated: 1 + (paper.coAuthors?.length || 0)
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

		console.error('Error accepting paper for review:', error);
		return json(
			{
				success: false,
				error: 'Failed to accept paper for review',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
