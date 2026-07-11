import { json, type RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import {
	hashEmailChangeToken,
	isEmailChangeExpired,
	sendEmailChangedNotification
} from '$lib/server/auth/emailChange';
import { revokeAllUserSessions } from '$lib/server/auth/SessionService';

const INVALID_OR_EXPIRED_MESSAGE = 'This confirmation link is invalid or has expired.';

export const GET: RequestHandler = async ({ url }) => {
	try {
		await start_mongo();

		const token = url.searchParams.get('token');
		if (!token) {
			return json({ error: INVALID_OR_EXPIRED_MESSAGE }, { status: 400 });
		}

		const tokenHash = hashEmailChangeToken(token);
		const user = await Users.findOne({ pendingEmailTokenHash: tokenHash });

		// A missing match covers both "never existed" and "already used" (the
		// hash is cleared on success below) -- neither is distinguished in the
		// response, so a reused or fabricated token reveals nothing.
		if (!user || !user.pendingEmail) {
			return json({ error: INVALID_OR_EXPIRED_MESSAGE }, { status: 400 });
		}

		if (!user.pendingEmailExpiresAt || isEmailChangeExpired(user.pendingEmailExpiresAt)) {
			return json({ error: INVALID_OR_EXPIRED_MESSAGE }, { status: 400 });
		}

		// Re-validate uniqueness: another account may have claimed this email
		// during the confirmation window since it was first requested.
		const collision = await Users.findOne({
			email: user.pendingEmail,
			id: { $ne: user.id }
		});
		if (collision) {
			return json({ error: 'This email is no longer available.' }, { status: 409 });
		}

		const oldEmail = user.email;
		const newEmail = user.pendingEmail;

		user.email = newEmail;
		user.emailVerified = true;
		user.emailVerifiedAt = new Date();
		user.pendingEmail = undefined;
		user.pendingEmailTokenHash = undefined;
		user.pendingEmailExpiresAt = undefined;
		user.pendingEmailLastSentAt = undefined;
		user.updatedAt = new Date().toISOString();

		await user.save();

		// TODO(audit): emit an ACCOUNT_EMAIL_CHANGED audit event here once the
		// EventService idempotency-key strategy for account-security events is
		// decided -- see the note in src/routes/api/account/email-change/+server.ts
		// for why this isn't wired in yet. Payload: { userId: user.id,
		// previousEmail: oldEmail, newEmail, timestamp: new Date() }.

		// Changing the primary account email is security-sensitive: force every
		// other device/session to authenticate again, the same as password reset.
		await revokeAllUserSessions(String(user.id || user._id), 'email_change');

		try {
			await sendEmailChangedNotification({
				to: oldEmail,
				firstName: user.firstName,
				newEmail
			});
		} catch (error) {
			// The email change itself already succeeded; a failure to notify the
			// old address must not be reported back as a failed confirmation.
			console.error('Failed to send email-change audit notification:', error);
		}

		return json({ success: true, email: newEmail });
	} catch (error) {
		console.error('Error confirming email change:', error);
		return json({ error: 'Internal server error.' }, { status: 500 });
	}
};
