import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Procurar pela chave pública do Stripe em várias locais
	// Suporta múltiplas convenções de nomes
	const stripePublicKey = 
		process.env.VITE_STRIPE_PUBLIC_KEY ||
		process.env.STRIPE_PUBLIC_KEY ||
		process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
		process.env.STRIPE_PUBLISHABLE_KEY;

	if (!stripePublicKey) {
		console.error('Stripe public key is not configured. Expected one of:');
		console.error('  - VITE_STRIPE_PUBLIC_KEY');
		console.error('  - STRIPE_PUBLIC_KEY');
		console.error('  - VITE_STRIPE_PUBLISHABLE_KEY');
		console.error('  - STRIPE_PUBLISHABLE_KEY');
		return {
			user: locals.user,
			stripePublicKey: null,
			error: 'Payment system is not configured. Please contact support.'
		};
	}

	console.log('✓ Stripe public key loaded successfully');

	return {
		user: locals.user,
		stripePublicKey
	};
};
