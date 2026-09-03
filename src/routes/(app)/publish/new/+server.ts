import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import type { User } from '$lib/types/User';
import { can } from '$lib/server/authorization/authorizationService';
import { getUserIdAliases } from '$lib/server/authorization/roleResolver';
import { emitPaperLifecycleEvent } from '$lib/server/paperLifecycleEvents';
import {
	UserBillingStatusError,
	assertUserCanSubmitPapers
} from '$lib/server/payments/userBillingStatusService';
import {
	normalizePaperCoverIds,
	validateSupplementaryFilesTotal
} from '$lib/utils/paperFileValidation';
import {
	countCorrespondingAuthors,
	getMarkedCorrespondingAuthor,
	markCorrespondingAuthor,
	normalizeAuthorSnapshots
} from '$lib/utils/paperAuthorAffiliations';

function normalizeUserId(input: any): string {
	if (!input) return '';
	if (typeof input === 'string') return input;
	if (input.id) return String(input.id);
	if (input._id) return String(input._id);
	return String(input);
}

function reconcileCorrespondingAuthor(
	authorAffiliations: ReturnType<typeof normalizeAuthorSnapshots>,
	correspondingAuthor: unknown,
	authorIds: Set<string>,
	requireOne: boolean
) {
	const markedCount = countCorrespondingAuthors(authorAffiliations);
	if (markedCount > 1) {
		return {
			error: 'Only one author can be marked as corresponding author.',
			status: 400
		};
	}

	const markedAuthor = getMarkedCorrespondingAuthor(authorAffiliations);
	let correspondingAuthorId = normalizeUserId(correspondingAuthor);
	const markedAuthorId = markedAuthor?.userId || '';

	if (markedAuthorId && correspondingAuthorId && markedAuthorId !== correspondingAuthorId) {
		return {
			error: 'Corresponding author selection does not match the marked author snapshot.',
			status: 400
		};
	}

	if (!correspondingAuthorId && markedAuthorId) {
		correspondingAuthorId = markedAuthorId;
	}

	if (requireOne && !correspondingAuthorId) {
		return {
			error: 'Select exactly one corresponding author before submitting.',
			status: 400
		};
	}

	if (correspondingAuthorId && authorIds.size > 0 && !authorIds.has(correspondingAuthorId)) {
		return {
			error: 'Corresponding author must be one of the paper authors.',
			status: 400
		};
	}

	return {
		correspondingAuthorId,
		authorAffiliations: correspondingAuthorId
			? markCorrespondingAuthor(authorAffiliations, correspondingAuthorId)
			: authorAffiliations
	};
}

async function getHubPaperPaymentPolicy(hubId: string | undefined) {
	if (!hubId) return null;
	const hub = await Hubs.findOne({ $or: [{ id: hubId }, { _id: hubId }] }).lean();
	const policy = String((hub as any)?.billing?.paperPaymentPolicy ?? 'publication');
	return policy === 'submission' || policy === 'review' || policy === 'publication'
		? policy
		: 'publication';
}

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const {
			paperPictures,
			content,
			mainAuthor,
			correspondingAuthor,
			title,
			abstract,
			keywords,
			pdfUrl,
			submittedBy,
			price,
			coAuthors = [],
			status,
			authors,
			authorAffiliations,
			hubId,
			isLinkedToHub,
			scopusArea,
			scopusSubArea,
			scopusClassifications,
			supplementaryMaterials,
			supplementaryFiles
		} = await request.json();

		const currentStatus = status || 'draft';

		if (!mainAuthor || !title || !abstract || !keywords || !pdfUrl || !submittedBy) {
			return json(
				{
					error: `Todos os campos sao obrigatorios. ${mainAuthor}, ${title}, ${abstract}, ${keywords}, ${pdfUrl}, ${submittedBy}`
				},
				{ status: 400 }
			);
		}

		const submittedById = normalizeUserId(submittedBy);
		if (!getUserIdAliases(user).includes(submittedById)) {
			return json({ error: 'submittedBy must match the authenticated user' }, { status: 403 });
		}

		const canSubmit = await can(user, 'paper.submit');
		if (!canSubmit) {
			return json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		const isStandaloneSubmission = !hubId && !isLinkedToHub;
		if (isStandaloneSubmission && currentStatus !== 'draft') {
			return json(
				{
					error: 'Standalone papers must be saved as a draft before payment and submission.',
					code: 'payment_required'
				},
				{ status: 402 }
			);
		}
		if (currentStatus !== 'draft') {
			try {
				assertUserCanSubmitPapers(user);
			} catch (error) {
				if (error instanceof UserBillingStatusError) {
					return json(
						{ error: error.message, code: error.code, billingStatus: error.billingStatus },
						{ status: error.status }
					);
				}
				throw error;
			}
		}
		const hubPaymentPolicy = await getHubPaperPaymentPolicy(hubId ? String(hubId) : undefined);
		if (hubPaymentPolicy === 'submission' && currentStatus !== 'draft') {
			return json(
				{
					error: 'This Hub requires payment before submission. Save the paper as a draft first.',
					code: 'payment_required',
					paymentPolicy: hubPaymentPolicy
				},
				{ status: 402 }
			);
		}

		const normalizedMainAuthorId = normalizeUserId(mainAuthor);
		const normalizedCoAuthors = coAuthors.map((author: User) => normalizeUserId(author)).filter(Boolean);
		const normalizedAuthors = authors?.map((author: User) => normalizeUserId(author)).filter(Boolean) || [];
		const normalizedAuthorAffiliations = normalizeAuthorSnapshots(authorAffiliations);
		const authorIds = new Set([normalizedMainAuthorId, ...normalizedCoAuthors, ...normalizedAuthors].filter(Boolean));
		const correspondingResolution = reconcileCorrespondingAuthor(
			normalizedAuthorAffiliations,
			correspondingAuthor,
			authorIds,
			currentStatus !== 'draft'
		);
		if ('error' in correspondingResolution) {
			return json({ error: correspondingResolution.error }, { status: correspondingResolution.status });
		}
		const supplementaryValidation = validateSupplementaryFilesTotal(supplementaryFiles || []);
		if (!supplementaryValidation.ok) {
			return json(
				{
					error: supplementaryValidation.message,
					code: 'supplementary_total_limit_exceeded',
					maxTotalSize: supplementaryValidation.maxBytes,
					currentTotalSize: supplementaryValidation.totalSize
				},
				{ status: 413 }
			);
		}
		const id = crypto.randomUUID();

		const newPaper = new Papers({
			_id: id,
			id,
			mainAuthor: normalizedMainAuthorId,
			correspondingAuthor: correspondingResolution.correspondingAuthorId || undefined,
			coAuthors: normalizedCoAuthors,
			authorAffiliations: correspondingResolution.authorAffiliations,
			authors: normalizedAuthors,
			status: currentStatus,
			content,
			paperPictures: normalizePaperCoverIds(paperPictures),
			title,
			abstract,
			keywords,
			pdfUrl,
			submittedBy: submittedById,
			price,
			...(hubId && { hubId, isLinkedToHub: true }),
			...(scopusArea && { scopusArea }),
			...(scopusSubArea && { scopusSubArea }),
			...(scopusClassifications?.length > 0 && { scopusClassifications }),
			...(supplementaryMaterials?.length > 0 && { supplementaryMaterials }),
			...(supplementaryFiles?.length > 0 && { supplementaryFiles }),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await newPaper.save();

		const mainAuthorUser = await Users.findById(normalizeUserId(mainAuthor));
		if (!mainAuthorUser) {
			return json({ error: 'Autor principal nao encontrado.' }, { status: 404 });
		}
		mainAuthorUser.papers.push(newPaper.id);
		await mainAuthorUser.save();

		for (const coAuthorId of normalizedCoAuthors) {
			const coAuthor = await Users.findById(coAuthorId);
			if (coAuthor) {
				coAuthor.papers.push(newPaper.id);
				await coAuthor.save();
			}
		}

		if (!newPaper.status || newPaper.status === 'draft') {
			try {
				await emitPaperLifecycleEvent('paper.created', newPaper, {
					actorId: user.id,
					metadata: {
						endpoint: '/publish/new'
					}
				});
			} catch (eventError) {
				console.error('Failed to emit paper created event:', eventError);
			}
		}

		if (newPaper.status && newPaper.status !== 'draft') {
			const submitterName = `${(submittedBy?.firstName || '').trim()} ${(submittedBy?.lastName || '').trim()}`.trim();

			try {
				await emitPaperLifecycleEvent('paper.submitted', newPaper, {
					actorId: user.id,
					metadata: {
						endpoint: '/publish/new',
						submittedByName: submitterName || undefined
					}
				});
			} catch (eventError) {
				console.error('Failed to emit paper submission event:', eventError);
			}
		}

		return json({ paper: { id: newPaper.id } }, { status: 201 });
	} catch (error) {
		console.error('Erro ao registrar paper:', error);
		return json({ error: 'Erro interno do servidor.' }, { status: 500 });
	}
};
