import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';
import { PaperLifecycleEmailService } from '$lib/services/PaperLifecycleEmailService';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';

function isAuthorOfPaper(paper: any, userId: string): boolean {
	if (!paper || !userId) return false;
	if (paper.mainAuthor?.toString?.() === userId) return true;
	if (paper.correspondingAuthor?.toString?.() === userId) return true;
	if (paper.submittedBy?.toString?.() === userId) return true;
	if (Array.isArray(paper.coAuthors) && paper.coAuthors.some((id: any) => id?.toString?.() === userId)) {
		return true;
	}
	return false;
}

export const POST: RequestHandler = async ({ params, locals, request }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const paperId = params.id;
		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paperDoc: any = await Papers.findOne({ id: paperId });
		if (!paperDoc) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		if (!isAuthorOfPaper(paperDoc, user.id)) {
			return json({ error: 'You do not have permission to request publication for this paper' }, { status: 403 });
		}

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Publication request is only allowed after round 2' }, { status: 400 });
		}

		if (paperDoc.status !== 'needing corrections' && paperDoc.status !== 'under correction') {
			return json({ error: 'Paper is not in the author correction phase' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));

		// If there is no hub, publish immediately
		if (!paperDoc.hubId) {
			const updatedPaper: any = await transitionPaperStatus({
				user,
				paperId,
				action: 'paper.publishStandalone',
				expectedStatus: body.expectedStatus || paperDoc.status,
				metadata: {
					endpoint: '/api/papers/[id]/request-publication',
					standalone: true
				}
			});
			paperDoc.status = updatedPaper.status;

			try {
				await NotificationService.createNotification({
					user: paperDoc.mainAuthor,
					type: 'paper_published',
					title: 'Paper Published',
					content: `Your paper "${paperDoc.title}" has been published.`,
					relatedPaperId: paperDoc.id,
					actionUrl: `/publish/published/${paperDoc.id}`,
					priority: 'high'
				});
			} catch (notificationError) {
				console.error('Failed to create paper published notification:', notificationError);
			}

			try {
				const authorIds = [
					String(paperDoc.mainAuthor || ''),
					String(paperDoc.correspondingAuthor || ''),
					String(paperDoc.submittedBy || ''),
					...((paperDoc.coAuthors || []).map((id: string) => String(id)))
				].filter(Boolean);

				const acceptedByName = `${(user.firstName || '').trim()} ${(user.lastName || '').trim()}`.trim();

				await PaperLifecycleEmailService.sendPaperAcceptedEmail({
					paperId: String(paperDoc.id),
					paperTitle: String(paperDoc.title || 'Paper sem titulo'),
					authorIds,
					acceptedByName: acceptedByName || undefined,
					acceptanceType: 'publication'
				});
			} catch (emailError) {
				console.error('Failed to send standalone publication email:', emailError);
			}

			return json({
				success: true,
				status: paperDoc.status,
				message: 'Paper published successfully'
			});
		}

		// Hub paper: request approval from hub admin (hub owner)
		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId,
			action: 'paper.requestPublication',
			expectedStatus: body.expectedStatus || paperDoc.status,
			metadata: {
				endpoint: '/api/papers/[id]/request-publication',
				hubId: String(paperDoc.hubId)
			}
		});
		paperDoc.status = updatedPaper.status;

		const hubDoc: any = await Hubs.findById(paperDoc.hubId).lean();
		const effectiveHubRoles = hubDoc ? await resolveEffectiveHubRoles(hubDoc) : null;
		const hubOwnerIds =
			effectiveHubRoles?.members
				.filter((member) => member.primaryRoleKey === 'HubOwner')
				.map((member) => member.userId)
				.filter(Boolean) ?? [];

		if (hubOwnerIds.length > 0) {
			try {
				await Promise.all(
					hubOwnerIds.map((hubOwnerId) =>
						NotificationService.createNotification({
							user: hubOwnerId.toString(),
							type: 'hub_paper_pending',
							title: 'Publication Approval Requested',
							content: `The author requested publication approval for the paper "${paperDoc.title}".`,
							relatedPaperId: paperDoc.id,
							relatedHubId: paperDoc.hubId,
							actionUrl: `/publish/publication-approval/${paperDoc.id}`,
							priority: 'high',
							metadata: {
								paperTitle: paperDoc.title,
								reviewRound: paperDoc.reviewRound,
								requestType: 'publication'
							}
						})
					)
				);
			} catch (notificationError) {
				console.error('Failed to create hub approval notification:', notificationError);
			}
		}

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Publication request sent to hub admin'
		});
	} catch (error) {
		if (error instanceof EditorialTransitionError) {
			return json(
				{
					error: error.message,
					code: error.code,
					currentStatus: error.currentStatus
				},
				{ status: error.status }
			);
		}
		console.error('Error requesting publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
