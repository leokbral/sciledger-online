import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (process.env.NODE_ENV === 'production' && env.ENABLE_STRIPE_TEST_CHECKOUT !== 'true') {
		throw error(404, 'Not found');
	}

	if (env.STRIPE_SECRET_KEY?.includes('_live_')) {
		throw error(403, 'Stripe test checkout cannot run with a live secret key');
	}

	return {};
};
