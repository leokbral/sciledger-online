import type { PageServerLoad } from './$types';
import type { Notification } from '$lib/types/Notification';
import Invitation from '$lib/db/models/Invitation';
import { start_mongo } from '$lib/db/mongooseConnection';

export const load: PageServerLoad = async ({ parent, locals }) => {
    await start_mongo();
    
    // Pegar os dados do layout pai que já carrega as notificações
    const { notifications } = await parent();
    
    // Buscar convites pendentes do usuário
    let invitations = [];
    if (locals.user) {
        invitations = await Invitation.find({ 
            reviewer: locals.user.id, 
            status: 'pending' 
        })
        .populate({
            path: 'hubId',
            select: 'title type description logoUrl createdBy'
        })
        .lean();
    }
    
    return {
        notifications: notifications as Notification[],
        invitations: invitations
    };
};