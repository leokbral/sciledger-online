/**
 * Username rules.
 *
 * The project documents none: `UserSchema` only says `required, unique`. These
 * rules are therefore derived from the convention the codebase already
 * produces -- a leading `@` followed by letters, digits, underscore, hyphen or
 * dot, as in the `@firstname_1234` handles the ORCID paths generated. Written
 * down here so the client and the server cannot disagree, and so a real rule
 * can replace this in one place if the project adopts one.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** After the leading `@`: letters, digits, `_`, `-`, `.` */
const USERNAME_BODY_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type UsernameValidationResult =
	| { ok: true; username: string }
	| { ok: false; reason: string };

/**
 * Normalizes and validates a username.
 *
 * Normalization is lowercase plus a single leading `@`, so `Ada`, `@ada` and
 * `@@ada` all resolve to `@ada`. Without that, two accounts could differ only
 * in case or in a stray prefix and the unique index would not catch it.
 */
export function validateUsername(input: unknown): UsernameValidationResult {
	if (typeof input !== 'string') {
		return { ok: false, reason: 'Enter a username.' };
	}

	const trimmed = input.trim();
	if (!trimmed) {
		return { ok: false, reason: 'Enter a username.' };
	}

	const body = trimmed.replace(/^@+/, '').toLowerCase();

	if (body.length < USERNAME_MIN_LENGTH) {
		return {
			ok: false,
			reason: `A username needs at least ${USERNAME_MIN_LENGTH} characters after the @.`
		};
	}

	if (body.length > USERNAME_MAX_LENGTH) {
		return {
			ok: false,
			reason: `A username can have at most ${USERNAME_MAX_LENGTH} characters after the @.`
		};
	}

	if (!USERNAME_BODY_REGEX.test(body)) {
		return {
			ok: false,
			reason:
				'A username may contain letters, digits, dots, hyphens and underscores, and must start with a letter or digit.'
		};
	}

	return { ok: true, username: `@${body}` };
}

/**
 * True when a Mongo write failed because the unique index on `username`
 * rejected it.
 *
 * Checking availability and then saving is two steps, so two requests can both
 * read "free" and only one can win. The loser surfaces here, and the caller
 * reports a collision instead of a 500 -- the availability check alone is not
 * a guarantee, the index is.
 */
export function isDuplicateUsernameError(error: unknown): boolean {
	const candidate = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
	if (!candidate) return false;
	if (candidate.code !== 11000) return false;

	if (candidate.keyPattern && Object.prototype.hasOwnProperty.call(candidate.keyPattern, 'username')) {
		return true;
	}

	return typeof candidate.message === 'string' && candidate.message.includes('username');
}
