import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import '$lib/db/models/User';
import type { User } from '$lib/types/User';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
    EditorialTransitionError,
    transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';
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

function normalizeId(input: any): string | undefined {
    if (!input) return undefined;
    if (typeof input === 'string') return input;
    if (typeof input === 'object') {
        if (input.id) return String(input.id);
        if (input._id) return String(input._id);
    }
    return undefined;
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
    let correspondingAuthorId = normalizeId(correspondingAuthor);
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

export const POST: RequestHandler = async ({ request, locals }) => {
    await start_mongo();

    try {
        const user = locals.user;
        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const data = await request.json();

        // Validate that id exists
        if (!data.id) {
            return json({ error: 'Paper ID is required.' }, { status: 400 });
        }

        const existingPaper = await Papers.findById(data.id).lean().exec();
        if (!existingPaper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        const authorization = await authorize(user, 'paper.edit', { paper: existingPaper });
        if (!authorization.allowed) {
            return json(
                { error: 'Insufficient permissions', reason: authorization.reason },
                { status: 403 }
            );
        }

        const previousStatus = String((existingPaper as any).status || '');
        const requestedStatus = String(data.status || previousStatus);
        const shouldSubmit = previousStatus === 'draft' && requestedStatus === 'reviewer assignment';

        // Validate required fields
        const requiredFields = ['mainAuthor', 'title', 'abstract', 'keywords', 'pdfUrl', 'submittedBy'];
        const missingFields = requiredFields.filter(field => !data[field]);

        if (missingFields.length > 0) {
            return json({ 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            }, { status: 400 });
        }

        // Safely handle arrays with optional chaining
        const _coAuthors = data.coAuthors?.map((a: User) => normalizeId(a)).filter(Boolean) || [];
        const _authors = data.authors?.map((a: User) => normalizeId(a)).filter(Boolean) || [];
        const normalizedAuthorAffiliations = normalizeAuthorSnapshots(data.authorAffiliations);
        const normalizedMainAuthorId = normalizeId(data.mainAuthor);
        const normalizedSubmittedById = normalizeId(data.submittedBy);
        const authorIds = new Set([normalizedMainAuthorId, ..._coAuthors, ..._authors].filter(Boolean) as string[]);
        const correspondingResolution = reconcileCorrespondingAuthor(
            normalizedAuthorAffiliations,
            data.correspondingAuthor,
            authorIds,
            shouldSubmit
        );
        if ('error' in correspondingResolution) {
            return json({ error: correspondingResolution.error }, { status: correspondingResolution.status });
        }
        const supplementaryValidation = validateSupplementaryFilesTotal(data.supplementaryFiles || []);
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
        if (requestedStatus !== previousStatus && !shouldSubmit && requestedStatus !== 'draft') {
            return json(
                { error: 'Status changes must use the editorial transition endpoints.' },
                { status: 400 }
            );
        }

        const updateData = {
            mainAuthor: normalizedMainAuthorId,
            authors: _authors,
            paperPictures: normalizePaperCoverIds(data.paperPictures),
            correspondingAuthor: correspondingResolution.correspondingAuthorId || undefined,
            coAuthors: _coAuthors,
            authorAffiliations: correspondingResolution.authorAffiliations,
            status: shouldSubmit ? previousStatus : requestedStatus,
            content: data.content,
            title: data.title,
            abstract: data.abstract,
            keywords: data.keywords,
            pdfUrl: data.pdfUrl,
            submittedBy: normalizedSubmittedById,
            price: data.price || 0,
            peer_review: data.peer_review,
            ...(data.scopusArea && { scopusArea: data.scopusArea }),
            ...(data.scopusSubArea && { scopusSubArea: data.scopusSubArea }),
            ...(data.scopusClassifications && data.scopusClassifications.length > 0 && { scopusClassifications: data.scopusClassifications }),
            supplementaryMaterials: data.supplementaryMaterials || [],
            supplementaryFiles: data.supplementaryFiles || [],
            updatedAt: new Date().toISOString()
        };


        let paper: any = await Papers.findByIdAndUpdate(
            data.id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                upsert: false // Ensure we don't create a new document
            }
        ).lean().exec();

        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        // Disparar comprovante de submissao quando sair de draft para reviewer assignment.
        if (shouldSubmit) {
            paper = await transitionPaperStatus({
                user,
                paperId: data.id,
                action: 'paper.submit',
                expectedStatus: previousStatus,
                metadata: {
                    endpoint: '/publish/edit/[slug]',
                    submittedFromDraft: true
                }
            });
        }

        return json({ paper }, { status: 200 });
        
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
        console.error('Error updating paper:', error);
        return json({ 
            error: 'Internal server error', 
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
