import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';

export const PATCH: RequestHandler = async ({ request, params }) => {
    await start_mongo();

    try {
        const { correctionDeadline, correctionAcceptedAt } = await request.json();
        const paperId = params.id;

        // Get current paper
        const currentPaper = await Papers.findOne({ id: paperId }).lean().exec();
        if (!currentPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        // Prepare update object
        const updateData: {
            updatedAt: Date;
            correctionDeadline?: Date;
            correctionAcceptedAt?: Date;
        } = {
            updatedAt: new Date()
        };

        // Update correction timing fields
        if (correctionDeadline) {
            updateData.correctionDeadline = new Date(correctionDeadline);
        }

        if (correctionAcceptedAt) {
            updateData.correctionAcceptedAt = new Date(correctionAcceptedAt);
        }

        // If only correctionAcceptedAt is provided, calculate the deadline
        if (correctionAcceptedAt && !correctionDeadline) {
            const startDate = new Date(correctionAcceptedAt);
            const deadline = new Date(startDate);
            deadline.setDate(deadline.getDate() + 15);
            updateData.correctionDeadline = deadline;
        }

        // If only deadline is provided, calculate the accepted date
        if (correctionDeadline && !correctionAcceptedAt && !currentPaper.correctionAcceptedAt) {
            const deadline = new Date(correctionDeadline);
            const acceptedDate = new Date(deadline);
            acceptedDate.setDate(acceptedDate.getDate() - 15);
            updateData.correctionAcceptedAt = acceptedDate;
        }

        console.log('Updating correction deadline:', {
            paperId,
            updateData
        });

        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            updateData,
            { new: true, runValidators: true }
        ).lean().exec();

        if (!updatedPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        return json({ success: true, paper: updatedPaper }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating correction deadline:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};

export const GET: RequestHandler = async ({ params }) => {
    await start_mongo();

    try {
        const paperId = params.id;

        const paper = await Papers.findOne({ id: paperId })
            .select('correctionAcceptedAt correctionDeadline correctionRequestedAt status')
            .lean()
            .exec();

        if (!paper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        // Calculate deadline info if paper is in correction status
        let deadlineInfo = null;
        if (paper.status === 'needing corrections' || paper.status === 'under correction') {
            const now = new Date();
            
            if (paper.correctionDeadline) {
                const timeDifference = paper.correctionDeadline.getTime() - now.getTime();
                const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
                const hoursRemaining = Math.ceil(timeDifference / (1000 * 60 * 60));
                const isOverdue = timeDifference < 0;

                deadlineInfo = {
                    hasDeadline: true,
                    daysRemaining: isOverdue ? Math.abs(daysRemaining) : daysRemaining,
                    hoursRemaining: isOverdue ? Math.abs(hoursRemaining) : hoursRemaining,
                    isOverdue,
                    deadlineDate: paper.correctionDeadline,
                    correctionStartDate: paper.correctionAcceptedAt,
                    totalDays: 15
                };
            }
        }

        return json({ 
            success: true, 
            paper: {
                id: paper.id,
                status: paper.status,
                correctionAcceptedAt: paper.correctionAcceptedAt,
                correctionDeadline: paper.correctionDeadline,
                correctionRequestedAt: paper.correctionRequestedAt
            },
            deadlineInfo 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error getting correction deadline:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};