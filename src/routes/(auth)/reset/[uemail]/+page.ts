import type { PageLoad } from './$types';

export const load = (({ params }) => {
	return {
		userEmail: params.uemail
	};
}) satisfies PageLoad;