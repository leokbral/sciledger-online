import crypto from 'crypto';

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function generatePasswordResetToken() {
	return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
}

export function hashPasswordResetToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export function getPasswordResetExpiresAt(now = new Date()) {
	return new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
}

export function isPasswordResetExpired(expiresAt: Date | string, now = new Date()) {
	return new Date(expiresAt).getTime() <= now.getTime();
}
