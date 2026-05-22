import { isRedirect, redirect } from '@sveltejs/kit';
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
			const reason = data?.error || 'Invalid invitation';
			throw redirect(302, `/invite/invalid?reason=${encodeURIComponent(reason)}`);
		}

		// Redireciona para o registro normal com os dados do convite
		const paperQuery = data.paperId ? `&paperId=${encodeURIComponent(data.paperId)}` : '';
		throw redirect(
			302,
			`/register?inviteToken=${token}&email=${encodeURIComponent(data.email)}&hubId=${data.hubId}${paperQuery}`
		);
	} catch (error) {
		if (isRedirect(error)) throw error;
		console.error('Error loading invitation:', error);
		throw redirect(302, '/invite/invalid?reason=' + encodeURIComponent('Failed to load invitation'));
	}
};
