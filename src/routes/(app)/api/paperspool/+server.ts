import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verificar se o usuário é revisor
        if (!user.roles?.reviewer) {
            return json({ error: 'Access denied. Reviewer role required.' }, { status: 403 });
        }

        // Buscar assignments de revisão para este usuário
        // Incluir apenas papers onde:
        // 1. O status é 'pending' (ainda não aceitou) OU 'accepted' (já aceitou)
        // 2. Excluir papers com status 'expired' (já tem 3 revisores)
        const reviewAssignments = await db.collection('reviewAssignments').find({
            reviewerId: user.id,
            status: { $in: ['pending', 'accepted'] }
        }).toArray();

        if (reviewAssignments.length === 0) {
            return json({ 
                success: true, 
                papers: [],
                message: 'No papers assigned for review'
            });
        }

        const paperIds = reviewAssignments.map(assignment => assignment.paperId);

        // Buscar informações dos papers
        const papers = await db.collection('papers').find({
            _id: { $in: paperIds },
            status: { $in: ['under negotiation', 'review_in_progress'] }
        }).toArray();

        // Enriquecer papers com informações do assignment
        const enrichedPapers = papers.map(paper => {
            const assignment = reviewAssignments.find(a => a.paperId === paper._id);
            return {
                ...paper,
                reviewAssignment: {
                    status: assignment?.status,
                    assignedAt: assignment?.assignedAt,
                    acceptedAt: assignment?.acceptedAt,
                    deadline: assignment?.deadline
                }
            };
        });

        // Separar papers por status do assignment
        const pendingPapers = enrichedPapers.filter(p => p.reviewAssignment.status === 'pending');
        const acceptedPapers = enrichedPapers.filter(p => p.reviewAssignment.status === 'accepted');

        return json({ 
            success: true, 
            papers: enrichedPapers,
            pending: pendingPapers,
            accepted: acceptedPapers,
            totalAssigned: enrichedPapers.length
        });

    } catch (error) {
        console.error('Error fetching papers pool:', error);
        return json({ 
            success: false, 
            error: 'Failed to fetch papers pool',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};