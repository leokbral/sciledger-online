import type { PageServerLoad } from './$types';
import type { Notification } from '$lib/types/Notification';

export const load: PageServerLoad = async ({ parent }) => {
    // Pegar os dados do layout pai que já carrega as notificações
    const { notifications } = await parent();
    
    return {
        notifications: notifications as Notification[]
    };
};