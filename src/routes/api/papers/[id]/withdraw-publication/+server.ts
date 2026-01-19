import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';

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

export const POST: RequestHandler = async ({ params, locals }) => {
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
			return json({ error: 'You do not have permission to withdraw this paper' }, { status: 403 });
		}

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Withdraw is only available after round 2' }, { status: 400 });
		}

		if (!['needing corrections', 'under correction', 'under negotiation'].includes(paperDoc.status)) {
			return json({ error: 'Paper cannot be withdrawn in its current status' }, { status: 400 });
		}

		// Withdraw back to draft and unlink from hub (if any)
		paperDoc.status = 'draft';
		paperDoc.hubId = null;
		paperDoc.isLinkedToHub = false;
		paperDoc.updatedAt = new Date().toISOString();
		await paperDoc.save();

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Paper withdrawn from publication'
		});
	} catch (error) {
		console.error('Error withdrawing publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
