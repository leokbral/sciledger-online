import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import '$lib/db/models/User';
import type { User } from '$lib/types/User';
import { PaperLifecycleEmailService } from '$lib/services/PaperLifecycleEmailService';

function normalizeId(input: any): string | undefined {
    if (!input) return undefined;
    if (typeof input === 'string') return input;
    if (typeof input === 'object') {
        if (input.id) return String(input.id);
        if (input._id) return String(input._id);
    }
    return undefined;
}

function normalizeAuthorAffiliations(input: unknown) {
    if (!Array.isArray(input)) return [];

    return input
        .map((item) => {
            const affiliation = item as Record<string, unknown>;
            const name = String(affiliation.name ?? '').trim();
            if (!name) return null;

            return {
                userId: affiliation.userId ? String(affiliation.userId) : undefined,
                username: affiliation.username ? String(affiliation.username) : undefined,
                name,
                department: String(affiliation.department ?? '').trim(),
                affiliation: String(affiliation.affiliation ?? '').trim()
            };
        })
        .filter(Boolean);
}

export const POST: RequestHandler = async ({ request }) => {
    await start_mongo();

    try {
        const data = await request.json();
        
        // Log incoming data for debugging
        console.log('Received data:', data);

        // Validate that id exists
        if (!data.id) {
            return json({ error: 'Paper ID is required.' }, { status: 400 });
        }

        const existingPaper = await Papers.findById(data.id).lean().exec();
        if (!existingPaper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        // Validate required fields
        const requiredFields = ['mainAuthor', 'correspondingAuthor', 'title', 'abstract', 'keywords', 'pdfUrl', 'submittedBy'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return json({ 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            }, { status: 400 });
        }

        // Safely handle arrays with optional chaining
        const _coAuthors = data.coAuthors?.map((a: User) => a.id) || [];
        const _authors = data.authors?.map((a: User) => a.id) || [];
        const normalizedAuthorAffiliations = normalizeAuthorAffiliations(data.authorAffiliations);
        const normalizedMainAuthorId = normalizeId(data.mainAuthor);
        const normalizedCorrespondingAuthorId = normalizeId(data.correspondingAuthor);
        const normalizedSubmittedById = normalizeId(data.submittedBy);

        const updateData = {
            mainAuthor: normalizedMainAuthorId,
            authors: _authors,
            paperPictures: data.paperPictures,
            correspondingAuthor: normalizedCorrespondingAuthorId,
            coAuthors: _coAuthors,
            authorAffiliations: normalizedAuthorAffiliations,
            status: data.status,//'draft', //'reviewer assignment'
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

        // Log update data for debugging
        console.log('Update data:', updateData);

        const paper = await Papers.findByIdAndUpdate(
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
        const previousStatus = String((existingPaper as any).status || '');
        const nextStatus = String((paper as any).status || '');
        if (nextStatus === 'reviewer assignment' && previousStatus !== 'reviewer assignment') {
            const authorIds = [
                String((paper as any).mainAuthor || ''),
                String((paper as any).correspondingAuthor || ''),
                String((paper as any).submittedBy || ''),
                ...((((paper as any).coAuthors || []) as string[]).map((id) => String(id)))
            ].filter(Boolean);

            const submitterName = `${(data?.submittedBy?.firstName || '').trim()} ${(data?.submittedBy?.lastName || '').trim()}`.trim();

            try {
                await PaperLifecycleEmailService.sendSubmissionConfirmation({
                    paperId: String((paper as any).id || data.id),
                    paperTitle: String((paper as any).title || 'Paper sem titulo'),
                    authorIds,
                    submittedByName: submitterName || undefined
                });
            } catch (emailError) {
                console.error('Failed to send submission confirmation email on edit:', emailError);
            }

            const hubId = String((paper as any).hubId || '');
            if (hubId) {
                try {
                    const hub = await Hubs.findById(hubId)
                        .select('title createdBy')
                        .lean();

                    const hubAdminId = hub?.createdBy ? String(hub.createdBy) : '';
                    if (hubAdminId) {
                        await PaperLifecycleEmailService.sendHubAdminSubmissionEmail({
                            hubAdminId,
                            hubName: String(hub?.title || 'Hub'),
                            paperId: String((paper as any).id || data.id),
                            paperTitle: String((paper as any).title || 'Untitled paper'),
                            submittedByName: submitterName || undefined
                        });
                    }
                } catch (adminEmailError) {
                    console.error('Failed to send hub admin submission email on edit:', adminEmailError);
                }
            }
        }

        return json({ paper }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating paper:', error);
        return json({ 
            error: 'Internal server error', 
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
