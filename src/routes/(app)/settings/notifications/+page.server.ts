import type { PageServerLoad } from './$types';

// Placeholder page -- no notification-preferences backend exists yet
// (the separate /notifications route is the notification feed, not settings).
export const load: PageServerLoad = async () => {
	return {};
};
