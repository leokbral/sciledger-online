import type { PageServerLoad } from './$types';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';

// Only the two fields the Account page needs are selected and returned --
// pendingEmailTokenHash / pendingEmailExpiresAt / pendingEmailLastSentAt must
// never reach the client.
export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		// Unreachable in practice: the parent +layout.server.ts already
		// redirects unauthenticated requests before this load runs.
		return { emailVerified: false, pendingEmail: null };
	}

	await start_mongo();

	const userDoc = await Users.findOne({ id: userId }).select('emailVerified pendingEmail').lean();

	return {
		emailVerified: !!userDoc?.emailVerified,
		pendingEmail: userDoc?.pendingEmail ?? null
	};
};
