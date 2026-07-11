import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import {
	hashEmailVerificationToken,
	isEmailVerificationExpired
} from '$lib/server/auth/emailVerification';

export const GET: RequestHandler = async ({ url }) => {
	await start_mongo();

	const token = url.searchParams.get('token');
	if (!token) {
		error(400, 'Verification token is required.');
	}

	const tokenHash = hashEmailVerificationToken(token);
	const user = await Users.findOne({ emailVerificationTokenHash: tokenHash });
	if (!user) {
		error(400, 'Invalid verification token.');
	}

	if (!user.emailVerificationExpiresAt || isEmailVerificationExpired(user.emailVerificationExpiresAt)) {
		error(400, 'Verification token has expired.');
	}

	user.emailVerified = true;
	user.emailVerifiedAt = new Date();
	user.verificationSource = 'register';
	user.emailVerificationTokenHash = undefined;
	user.emailVerificationExpiresAt = undefined;
	user.updatedAt = new Date().toISOString();
	await user.save();

	throw redirect(302, '/verify-email/success');
};
