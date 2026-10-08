import { isRedirect, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import OrcidSignupClaim from '$lib/db/models/OrcidSignupClaim';
import { respondWithSession } from '$lib/server/auth/authResponse';
import { createOrcidUser } from '$lib/server/orcid/createOrcidUser';
import { isSecureRequest } from '$lib/server/auth/sessionCookie';
import {
	hashOrcidSignupToken,
	isOrcidSignupExpired,
	serializeExpiredOrcidSignupCookie
} from '$lib/server/auth/orcidSignupClaim';

/**
 * Finishes an ORCID sign-up whose e-mail had to be confirmed.
 *
 * Opening this link is the proof of ownership that the ORCID record could not
 * give us. Two outcomes, decided by whether the confirmed address is already
 * on an account:
 *
 *  - it is: the ORCID iD is attached to THAT account. Nothing is merged and
 *    nothing is overwritten -- the person simply gains a second way to sign in
 *    to the account they already had. This is the case that used to end in a
 *    duplicate account and "This email is already in use".
 *  - it is not: the account is created now, with that address, already
 *    verified.
 *
 * Either way the claim is consumed, so a link cannot be replayed.
 */
async function finishSignup(request: Request, url: URL): Promise<Response> {
	const token = url.searchParams.get('token');
	if (!token) {
		throw redirect(302, '/login?error=orcid_confirm_invalid');
	}

	await start_mongo();

	const claim = await OrcidSignupClaim.findOne({ tokenHash: hashOrcidSignupToken(token) });

	if (!claim || !claim.pendingEmail || isOrcidSignupExpired(claim.expiresAt)) {
		throw redirect(302, '/login?error=orcid_confirm_expired');
	}

	const email = String(claim.pendingEmail);
	const orcid = String(claim.orcid);

	// Someone may have signed in with this ORCID iD through another route while
	// the link sat unopened. Then there is nothing left to do but log them in.
	const alreadyLinked = await Users.findOne({ orcid });
	if (alreadyLinked) {
		await OrcidSignupClaim.deleteOne({ id: claim.id });
		return respondWithRedirect(alreadyLinked, request, url, '/');
	}

	const existingUser = await Users.findOne({ email });

	if (existingUser) {
		existingUser.orcid = orcid;
		// The address was already theirs; confirming it here proves they still
		// control it, so it counts as verified from now on.
		existingUser.emailVerified = true;
		existingUser.emailVerifiedAt = existingUser.emailVerifiedAt || new Date();
		existingUser.verificationSource = 'orcid_email_confirmed';
		existingUser.updatedAt = new Date().toISOString();
		await existingUser.save();
		await OrcidSignupClaim.deleteOne({ id: claim.id });

		return respondWithRedirect(existingUser, request, url, '/');
	}

	const newUser = await createOrcidUser({
		orcid,
		firstName: claim.firstName || 'User',
		lastName: claim.lastName || 'ORCID',
		email,
		verificationSource: 'orcid_email_confirmed'
	});

	await OrcidSignupClaim.deleteOne({ id: claim.id });

	// A brand-new account still has no country or birthday, so it goes through
	// the profile screen once.
	return respondWithRedirect(newUser, request, url, '/complete-profile');
}

async function respondWithRedirect(
	user: any,
	request: Request,
	url: URL,
	location: string
): Promise<Response> {
	const response = await respondWithSession({ user }, { request, url });
	const headers = new Headers(response.headers);
	headers.set('Location', location);
	// The claim is consumed; drop the browser's pointer to it.
	headers.append('set-cookie', serializeExpiredOrcidSignupCookie({ secure: isSecureRequest(url, request) }));

	return new Response(null, { status: 302, headers });
}

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		return await finishSignup(request, url);
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}

		console.error('❌ ORCID sign-up confirmation error:', error);
		throw redirect(302, '/login?error=orcid_confirm_failed');
	}
};
