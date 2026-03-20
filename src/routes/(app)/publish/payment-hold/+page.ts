import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return {
		...data,
		user: data.user,
		stripePublicKey: data.stripePublicKey,
		error: data.error
	};
};
