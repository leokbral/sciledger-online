import { describe, expect, it } from 'vitest';
import {
	PASSWORD_RESET_TOKEN_BYTES,
	PASSWORD_RESET_TTL_MS,
	generatePasswordResetToken,
	getPasswordResetExpiresAt,
	hashPasswordResetToken,
	isPasswordResetExpired
} from './passwordReset';

describe('password reset token helpers', () => {
	it('generates a cryptographically random hex token', () => {
		const token = generatePasswordResetToken();

		expect(token).toMatch(/^[a-f0-9]+$/);
		expect(token).toHaveLength(PASSWORD_RESET_TOKEN_BYTES * 2);
		expect(generatePasswordResetToken()).not.toBe(token);
	});

	it('hashes the token with SHA-256 without returning the raw token', () => {
		const token = 'reset-token';
		const hash = hashPasswordResetToken(token);

		expect(hash).toBe('7c18b43a1d8227cddb332e67971e790ce35ac2303f4fccfb2a565622f2fe1cec');
		expect(hash).not.toContain(token);
		expect(hash).toHaveLength(64);
	});

	it('is deterministic for the same input', () => {
		expect(hashPasswordResetToken('reset-token')).toBe(hashPasswordResetToken('reset-token'));
	});

	it('sets a 1 hour expiration window', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');
		const expiresAt = getPasswordResetExpiresAt(now);

		expect(expiresAt.getTime() - now.getTime()).toBe(PASSWORD_RESET_TTL_MS);
	});

	it('detects expired tokens', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');

		expect(isPasswordResetExpired(new Date('2026-07-10T11:59:59.000Z'), now)).toBe(true);
		expect(isPasswordResetExpired(new Date('2026-07-10T12:00:00.000Z'), now)).toBe(true);
		expect(isPasswordResetExpired(new Date('2026-07-10T12:00:01.000Z'), now)).toBe(false);
	});
});
