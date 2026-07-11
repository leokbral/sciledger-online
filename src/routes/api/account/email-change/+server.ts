import { json, type RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import { normalizeAndValidateEmail, normalizeEmail } from '$lib/server/auth/normalizeEmail';
import {
	getEmailChangeConfirmationUrl,
	prepareEmailChange,
	sendEmailChangeConfirmation
} from '$lib/server/auth/emailChange';

export const POST: RequestHandler = async ({ request, url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	await start_mongo();

	const { email } = await request.json();
	if (typeof email !== 'string' || !email.trim()) {
		return json({ error: 'Email is required.' }, { status: 400 });
	}

	const normalizedEmail = normalizeAndValidateEmail(email);
	if (!normalizedEmail) {
		return json({ error: 'Invalid email format.' }, { status: 400 });
	}

	const user = await Users.findOne({ $or: [{ id: locals.user.id }, { _id: locals.user.id }] });
	if (!user) {
		return json({ error: 'User not found.' }, { status: 404 });
	}

	if (normalizedEmail === normalizeEmail(user.email)) {
		return json({ error: 'New email must be different from your current email.' }, { status: 400 });
	}

	const existingUser = await Users.findOne({ email: normalizedEmail });
	if (existingUser) {
		return json({ error: 'This email is already in use.' }, { status: 409 });
	}

	const prepared = prepareEmailChange(normalizedEmail);
	user.pendingEmail = prepared.pendingEmail;
	user.pendingEmailTokenHash = prepared.pendingEmailTokenHash;
	user.pendingEmailExpiresAt = prepared.pendingEmailExpiresAt;
	user.pendingEmailLastSentAt = prepared.pendingEmailLastSentAt;
	user.updatedAt = new Date().toISOString();

	await user.save();

	// TODO(audit): emit an ACCOUNT_EMAIL_CHANGE_REQUESTED audit event via
	// EventService.emitEvent() once its idempotency-key strategy is decided
	// for this kind of event. EventService (src/lib/services/EventService.ts)
	// exists and its `activity` channel is architecturally the right place --
	// but ActivityEventSchema enforces a UNIQUE index on `eventKey`, which is
	// derived from `type` + `entityType` + `entityId` + a fixed allowlist of
	// metadata keys (IDEMPOTENCY_METADATA_KEYS) that does not include
	// email-change-specific fields. As-is, a second request from the same
	// user would compute an identical eventKey and be silently deduped,
	// which is exactly wrong for an audit trail where every occurrence must
	// be recorded. This needs either an explicit per-call `idempotencyKey`
	// (e.g. including the token hash or a timestamp) or a dedicated
	// allowlist entry before wiring this in -- not implementing a parallel
	// logging system in the meantime. Payload to record: { userId: user.id,
	// previousEmail: user.email, pendingEmail: normalizedEmail, timestamp: new Date() }.

	await sendEmailChangeConfirmation({
		to: normalizedEmail,
		firstName: user.firstName,
		confirmationUrl: getEmailChangeConfirmationUrl(url.origin, prepared.token)
	});

	return json({
		success: true,
		message: 'Confirmation email sent to your new address.',
		pendingEmail: normalizedEmail
	});
};
