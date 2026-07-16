import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /settings is a landing route only -- it always redirects into the default
// Settings section. Auth is already enforced by the parent +layout.server.ts.
export const load: PageServerLoad = async () => {
	throw redirect(302, '/settings/account');
};
