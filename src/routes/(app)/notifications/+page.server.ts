import type { PageServerLoad } from './$types';
import type { Notification } from '$lib/types/Notification';
import Invitation from '$lib/db/models/Invitation';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { start_mongo } from '$lib/db/mongooseConnection';

export const load: PageServerLoad = async ({ parent, locals }) => {
    await start_mongo();
    
    // Pegar os dados do layout pai que já carrega as notificações
    const { notifications } = await parent();
    
    // Buscar convites de hub pendentes do usuário
    let hubInvitations = [];
    let paperReviewInvitations = [];
    
    if (locals.user) {
        hubInvitations = await Invitation.find({ 
            reviewer: locals.user.id, 
            status: 'pending' 
        })
        .populate({
            path: 'hubId',
            select: 'title type description logoUrl createdBy'
        })
        .lean();

        // Buscar convites de revisão de papers pendentes
        paperReviewInvitations = await PaperReviewInvitation.find({
            reviewer: locals.user.id,
            status: 'pending'
        })
        .populate({
            path: 'paper',
            select: 'id title abstract authors'
        })
        .populate({
            path: 'invitedBy',
            select: 'firstName lastName email'
        })
        .populate({
            path: 'hubId',
            select: 'title'
        })
        .lean();
    }
    
    return {
        notifications: notifications as Notification[],
        hubInvitations: hubInvitations,
        paperReviewInvitations: paperReviewInvitations
    };
};