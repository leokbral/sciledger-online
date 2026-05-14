import { json, type RequestHandler } from '@sveltejs/kit';
import Reviews from '$lib/db/models/Review';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
import {
	buildReviewAttachmentResponse,
	findReviewAttachmentGridFsFile
} from '$lib/server/reviewAttachment';
import { canManageHub, normalizeId } from '$lib/helpers/hubPermissions';

function getIdAliases(value: unknown): string[] {
	if (!value) return [];

	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? [trimmed] : [];
	}

	if (typeof value !== 'object') return [];

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};
	const aliases = [candidate.id, candidate._id].filter(Boolean).map((alias) => String(alias));
	const stringified = candidate.toString?.();

	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases));
}

function matchesAnyUserAlias(value: unknown, userAliases: Set<string>): boolean {
	return getIdAliases(value).some((alias) => userAliases.has(alias));
}

function listContainsUserAlias(values: unknown, userAliases: Set<string>): boolean {
	return Array.isArray(values) && values.some((value) => matchesAnyUserAlias(value, userAliases));
}

function canDownloadReviewAttachment(review: any, paper: any, user: any): boolean {
	const userAliases = new Set(getIdAliases(user));
	const userId = normalizeId(user?.id ?? user?._id);

	if (!userAliases.size || !userId) return false;
	if (user?.roles?.admin || user?.roles?.editor) return true;
	if (matchesAnyUserAlias(review?.reviewerId, userAliases)) return true;
	if (matchesAnyUserAlias(paper?.mainAuthor, userAliases)) return true;
	if (matchesAnyUserAlias(paper?.correspondingAuthor, userAliases)) return true;
	if (matchesAnyUserAlias(paper?.submittedBy, userAliases)) return true;
	if (listContainsUserAlias(paper?.coAuthors, userAliases)) return true;
	if (listContainsUserAlias(paper?.authors, userAliases)) return true;

	const isAssignedReviewer = (paper?.peer_review?.responses ?? []).some((response: any) => {
		return (
			matchesAnyUserAlias(response?.reviewerId, userAliases) &&
			['accepted', 'completed'].includes(String(response?.status ?? ''))
		);
	});
	if (isAssignedReviewer) return true;

	const hub = typeof paper?.hubId === 'object' ? paper.hubId : null;
	if (canManageHub(hub, userId)) return true;
	if (listContainsUserAlias(hub?.reviewers, userAliases)) return true;

	return false;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const attachmentId = params.id;
	if (!attachmentId) {
		return json({ error: 'Review attachment ID is required' }, { status: 400 });
	}

	try {
		await start_mongo();

		const review = await Reviews.findOne({
			$or: [{ 'reviewAttachment.fileId': attachmentId }, { 'reviewAttachment.id': attachmentId }]
		})
			.lean()
			.exec();

		if (!review?.reviewAttachment) {
			return json({ error: 'Review attachment not found' }, { status: 404 });
		}

		const paperId = normalizeId(review.paperId);
		if (!paperId) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}
		const paper = await Papers.findOne({ id: paperId }).populate('hubId').lean().exec();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		if (!canDownloadReviewAttachment(review, paper, user)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const fileDoc = await findReviewAttachmentGridFsFile(review.reviewAttachment.fileId);
		if (!fileDoc) {
			return json({ error: 'Review attachment file not found' }, { status: 404 });
		}

		return buildReviewAttachmentResponse(fileDoc);
	} catch (error) {
		console.error('Error downloading review attachment:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
