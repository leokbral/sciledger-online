import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import OrcidSignupClaim from '$lib/db/models/OrcidSignupClaim';
import {
	ORCID_SIGNUP_COOKIE_NAME,
	isOrcidSignupExpired
} from '$lib/server/auth/orcidSignupClaim';

/**
 * The form shown after ORCID authenticates someone whose record publishes no
 * e-mail address. The half-finished sign-up lives in `orcidSignupClaims`; the
 * browser holds only its id, in an httpOnly cookie.
 *
 * Only the first name and whether a link was already sent reach the client --
 * never the claim id, the token hash, or the ORCID iD.
 */
export const load: PageServerLoad = async ({ cookies }) => {
	const claimId = cookies.get(ORCID_SIGNUP_COOKIE_NAME);
	if (!claimId) {
		throw redirect(302, '/login?error=orcid_signup_expired');
	}

	await start_mongo();

	const claim = await OrcidSignupClaim.findOne({ id: claimId })
		.select('firstName pendingEmail tokenHash expiresAt')
		.lean();

	// A claim expires by itself (TTL index), so an absent document and a stale
	// one mean the same thing to the person: start the ORCID sign-in again.
	if (!claim || isOrcidSignupExpired(claim.expiresAt)) {
		throw redirect(302, '/login?error=orcid_signup_expired');
	}

	return {
		firstName: claim.firstName || '',
		// Lets the page show "we sent a link to X" after a reload, without
		// revealing anything the person did not type themselves.
		sentTo: claim.tokenHash ? (claim.pendingEmail ?? null) : null
	};
};
