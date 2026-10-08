import * as crypto from 'crypto';
import Users from '$lib/db/models/User';

/**
 * Verification fields for an account that arrived through ORCID.
 *
 * A public ORCID e-mail is treated as verified: ORCID itself confirmed it. An
 * address the person typed into the sign-up form is verified too, but by a
 * different proof -- they clicked a link we sent to it -- so the caller says
 * which applies.
 */
export function getOrcidVerificationFields(emailIsVerified: boolean, source: string) {
	if (!emailIsVerified) {
		return {
			emailVerified: false,
			verificationSource: source
		};
	}

	return {
		emailVerified: true,
		emailVerifiedAt: new Date(),
		verificationSource: source
	};
}

/**
 * The `@handle_1234` form the platform gives ORCID accounts, made unique by
 * appending a counter when the base is taken.
 */
export async function generateUniqueOrcidUsername(firstName: string, orcid: string) {
	const baseUsername = `@${String(firstName || 'user').toLowerCase()}_${orcid.split('-').pop()}`;
	let username = baseUsername;
	let usernameExists = await Users.findOne({ username });
	let counter = 1;

	while (usernameExists) {
		username = `${baseUsername}_${counter}`;
		usernameExists = await Users.findOne({ username });
		counter++;
	}

	return username;
}

export type CreateOrcidUserInput = {
	orcid: string;
	firstName: string;
	lastName: string;
	/** A real address, always. The platform no longer invents placeholders. */
	email: string;
	/** `'orcid'` when ORCID published the address, `'orcid_email_confirmed'` when the person confirmed it. */
	verificationSource: string;
	accessToken?: string;
	refreshToken?: string;
	tokenExpiry?: Date;
};

/**
 * Creates an account for an ORCID identity.
 *
 * Shared by the callback (when ORCID publishes the e-mail) and by the sign-up
 * confirmation (when the person proved an address themselves) so the two paths
 * cannot drift apart on username generation, the random password, or the
 * verification fields.
 *
 * The password is random and never shown: these accounts sign in through ORCID
 * or, once they hold a real address, through password recovery.
 */
export async function createOrcidUser(input: CreateOrcidUserInput) {
	const username = await generateUniqueOrcidUsername(input.firstName, input.orcid);
	const userId = crypto.randomUUID();
	const now = new Date().toISOString();

	const user = new Users({
		_id: userId,
		id: userId,
		firstName: input.firstName,
		lastName: input.lastName,
		email: input.email,
		username,
		country: '',
		dob: '',
		password: crypto.randomBytes(32).toString('hex'),
		...getOrcidVerificationFields(true, input.verificationSource),
		orcid: input.orcid,
		orcidAccessToken: input.accessToken,
		orcidRefreshToken: input.refreshToken,
		orcidTokenExpiry: input.tokenExpiry,
		createdAt: now,
		updatedAt: now
	});

	await user.save();

	return user;
}
