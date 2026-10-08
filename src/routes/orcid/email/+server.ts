import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SITE_URL } from '$env/static/private';
import { start_mongo } from '$lib/db/mongooseConnection';
import OrcidSignupClaim from '$lib/db/models/OrcidSignupClaim';
import { normalizeAndValidateEmail } from '$lib/server/auth/normalizeEmail';
import { isOrcidPlaceholderEmail } from '$lib/helpers/orcidPlaceholderEmail';
import {
	ORCID_SIGNUP_COOKIE_NAME,
	getOrcidSignupConfirmationUrl,
	isOrcidSignupExpired,
	prepareOrcidSignupEmail,
	sendOrcidSignupConfirmation
} from '$lib/server/auth/orcidSignupClaim';

/**
 * Accepts the address for a half-finished ORCID sign-up and sends the
 * confirmation link to it.
 *
 * This endpoint deliberately does NOT say whether the address already belongs
 * to an account. Doing so would turn the form into a membership oracle for any
 * address an attacker cares to try. The response is the same either way, and
 * what differs is only what the confirmation does once the link is used:
 * create an account, or link the ORCID iD to the one that is already there.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const claimId = cookies.get(ORCID_SIGNUP_COOKIE_NAME);
	if (!claimId) {
		return json(
			{ success: false, message: 'Your ORCID sign-in expired. Please sign in with ORCID again.' },
			{ status: 440 }
		);
	}

	let body: { email?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ success: false, message: 'Invalid request.' }, { status: 400 });
	}

	const normalizedEmail = normalizeAndValidateEmail(body.email);
	if (!normalizedEmail) {
		return json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
	}

	// The placeholder domain is not a real mailbox; accepting it here would
	// recreate exactly the dead end this flow exists to remove.
	if (isOrcidPlaceholderEmail(normalizedEmail)) {
		return json({ success: false, message: 'Please enter a real email address.' }, { status: 400 });
	}

	await start_mongo();

	const claim = await OrcidSignupClaim.findOne({ id: claimId });
	if (!claim || isOrcidSignupExpired(claim.expiresAt)) {
		return json(
			{ success: false, message: 'Your ORCID sign-in expired. Please sign in with ORCID again.' },
			{ status: 440 }
		);
	}

	const prepared = prepareOrcidSignupEmail(normalizedEmail);
	claim.pendingEmail = prepared.pendingEmail;
	claim.tokenHash = prepared.tokenHash;
	claim.expiresAt = prepared.expiresAt;
	claim.updatedAt = new Date();
	await claim.save();

	try {
		await sendOrcidSignupConfirmation({
			to: prepared.pendingEmail,
			firstName: claim.firstName || 'there',
			confirmationUrl: getOrcidSignupConfirmationUrl(SITE_URL, prepared.token)
		});
	} catch (error) {
		// Full detail stays in the server log; the client is told only that the
		// send failed, with no internals and nothing account-specific.
		console.error('❌ Failed to send ORCID sign-up confirmation:', error);
		return json(
			{ success: false, message: 'We could not send the confirmation email. Please try again.' },
			{ status: 502 }
		);
	}

	return json({ success: true, email: prepared.pendingEmail });
};
