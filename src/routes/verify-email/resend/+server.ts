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
import { normalizeAndValidateEmail } from '$lib/server/auth/normalizeEmail';

export const POST: RequestHandler = async ({ request, url }) => {
	let body: { email?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, { status: 400 });
	}
	const normalizedEmail = normalizeAndValidateEmail(body?.email);
	if (!normalizedEmail) return json({ error: 'A valid email is required.' }, { status: 400 });

	try {
		await start_mongo();

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
			const retryAfterSeconds = getEmailVerificationCooldownSeconds(
				user.emailVerificationLastSentAt
			);
			return json(
				{
					error: `Please wait ${retryAfterSeconds} seconds before requesting another verification email.`,
					retryAfterSeconds
				},
				{ status: 429 }
			);
		}

		const previous = {
			emailVerificationTokenHash: user.emailVerificationTokenHash,
			emailVerificationExpiresAt: user.emailVerificationExpiresAt,
			emailVerificationLastSentAt: user.emailVerificationLastSentAt
		};
		const token = generateEmailVerificationToken();
		user.emailVerificationTokenHash = hashEmailVerificationToken(token);
		user.emailVerificationExpiresAt = getEmailVerificationExpiresAt();
		user.emailVerificationLastSentAt = new Date();
		user.verificationSource = 'register';
		user.updatedAt = new Date().toISOString();
		await user.save();

		try {
			await sendEmailVerification({
				to: user.email,
				firstName: user.firstName,
				verificationUrl: getEmailVerificationUrl(url.origin, token)
			});
		} catch (deliveryError) {
			// Keep the prior link usable and do not impose a cooldown for failed delivery.
			// The token condition prevents overwriting a newer resend or a completed verification.
			const set: Record<string, unknown> = {};
			const unset: Record<string, string> = {};
			for (const [key, value] of Object.entries(previous)) {
				if (value == null) unset[key] = '';
				else set[key] = value;
			}
			try {
				await Users.updateOne(
					{
						email: normalizedEmail,
						emailVerified: false,
						emailVerificationTokenHash: hashEmailVerificationToken(token)
					},
					{
						...(Object.keys(set).length ? { $set: set } : {}),
						...(Object.keys(unset).length ? { $unset: unset } : {})
					}
				);
			} catch (rollbackError) {
				console.error('Failed to restore email verification state:', rollbackError);
			}
			console.error('Failed to send verification email:', deliveryError);
			return json(
				{
					error: 'We could not send the verification email. Please try again later.',
					code: 'email_delivery_failed'
				},
				{ status: 503 }
			);
		}

		return json(genericSuccess);
	} catch (error) {
		console.error('Email verification resend failed:', error);
		return json(
			{
				error: 'Unable to process verification right now. Please try again later.',
				code: 'verification_unavailable'
			},
			{ status: 500 }
		);
	}
};
