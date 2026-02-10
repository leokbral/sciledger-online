import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
    const token = url.searchParams.get('token');
    
    if (!token) {
        throw redirect(302, '/login');
    }

    try {
        const response = await fetch(`/invite/register?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
            throw redirect(302, '/register?error=' + encodeURIComponent(data.error || 'Invalid invitation'));
        }

        // Redireciona para o registro normal com os dados do convite
        throw redirect(302, `/register?inviteToken=${token}&email=${encodeURIComponent(data.email)}&hubId=${data.hubId}`);

    } catch (error) {
        if (error instanceof Response) throw error;
        console.error('Error loading invitation:', error);
        throw redirect(302, '/register?error=' + encodeURIComponent('Failed to load invitation'));
    }
};
