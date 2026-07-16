import { json, type RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import {
	getEmailChangeConfirmationUrl,
	getEmailChangeCooldownSeconds,
	isEmailChangeCooldownActive,
	prepareEmailChange,
	sendEmailChangeConfirmation
} from '$lib/server/auth/emailChange';

export const POST: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	await start_mongo();

	const user = await Users.findOne({ $or: [{ id: locals.user.id }, { _id: locals.user.id }] });
	if (!user) {
		return json({ error: 'User not found.' }, { status: 404 });
	}

	if (!user.pendingEmail || !user.pendingEmailTokenHash) {
		return json({ error: 'No pending email change found.' }, { status: 400 });
	}

	if (isEmailChangeCooldownActive(user.pendingEmailLastSentAt)) {
		const retryAfterSeconds = getEmailChangeCooldownSeconds(user.pendingEmailLastSentAt);
		return json(
			{
				error: `Please wait ${retryAfterSeconds} seconds before requesting another confirmation email.`,
				retryAfterSeconds
			},
			{ status: 429 }
		);
	}

	const prepared = prepareEmailChange(user.pendingEmail);
	user.pendingEmailTokenHash = prepared.pendingEmailTokenHash;
	user.pendingEmailExpiresAt = prepared.pendingEmailExpiresAt;
	user.pendingEmailLastSentAt = prepared.pendingEmailLastSentAt;
	user.updatedAt = new Date().toISOString();

	await user.save();

	// TODO(audit): emit an ACCOUNT_EMAIL_CHANGE_RESEND audit event once the
	// EventService idempotency-key strategy is decided -- see the note in
	// src/routes/api/account/email-change/+server.ts. Payload: { userId: user.id,
	// previousEmail: user.email, pendingEmail: user.pendingEmail, timestamp: new Date() }.

	await sendEmailChangeConfirmation({
		to: user.pendingEmail,
		firstName: user.firstName,
		confirmationUrl: getEmailChangeConfirmationUrl(url.origin, prepared.token)
	});

	return json({ success: true, message: 'Confirmation email resent.' });
};
