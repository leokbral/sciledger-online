import { json, type RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import {
	generateEmailVerificationToken,
	getEmailVerificationCooldownSeconds,
	getEmailVerificationExpiresAt,
	getEmailVerificationUrl,
	hashEmailVerificationToken,
	isEmailVerificationCooldownActive,
	sendEmailVerification
} from '$lib/server/auth/emailVerification';
import { normalizeEmail } from '$lib/server/auth/normalizeEmail';

export const POST: RequestHandler = async ({ request, url }) => {
	await start_mongo();

	const { email } = await request.json();
	const normalizedEmail = normalizeEmail(String(email || ''));
	if (!normalizedEmail) {
		return json({ error: 'Email is required.' }, { status: 400 });
	}

	const genericSuccess = {
		success: true,
		message: 'If an account exists for this email, a verification email has been sent.'
	};

	const user = await Users.findOne({ email: normalizedEmail });
	if (!user) {
		return json(genericSuccess);
	}

	if (user.emailVerified !== false || user.verificationSource !== 'register') {
		return json(genericSuccess);
	}

	if (isEmailVerificationCooldownActive(user.emailVerificationLastSentAt)) {
		const retryAfterSeconds = getEmailVerificationCooldownSeconds(user.emailVerificationLastSentAt);
		return json(
			{
				error: `Please wait ${retryAfterSeconds} seconds before requesting another verification email.`,
				retryAfterSeconds
			},
			{ status: 429 }
		);
	}

	const token = generateEmailVerificationToken();
	user.emailVerificationTokenHash = hashEmailVerificationToken(token);
	user.emailVerificationExpiresAt = getEmailVerificationExpiresAt();
	user.emailVerificationLastSentAt = new Date();
	user.verificationSource = 'register';
	user.updatedAt = new Date().toISOString();
	await user.save();

	await sendEmailVerification({
		to: user.email,
		firstName: user.firstName,
		verificationUrl: getEmailVerificationUrl(url.origin, token)
	});

	return json(genericSuccess);
};
