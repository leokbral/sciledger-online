import type { PageServerLoad } from './$types';

// isReviewer comes from the parent Settings layout (+layout.server.ts) --
// nothing additional to load here.
export const load: PageServerLoad = async () => {
	return {};
};
