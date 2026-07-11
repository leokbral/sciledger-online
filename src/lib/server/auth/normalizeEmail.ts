export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/**
 * Normalizes (trim + lowercase) and validates basic email shape/length in
 * one step. Returns null for anything that isn't a plausible email address.
 *
 * This is the single source of truth for "is this a usable email address" --
 * every endpoint that accepts a raw email from a request body should call
 * this instead of re-implementing its own regex/length check.
 */
export function normalizeAndValidateEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const email = normalizeEmail(value);
	if (email.length > MAX_EMAIL_LENGTH || !EMAIL_FORMAT_REGEX.test(email)) {
		return null;
	}

	return email;
}
