import { describe, expect, it } from 'vitest';
import {
	EMAIL_VERIFICATION_TOKEN_BYTES,
	EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
	EMAIL_VERIFICATION_TTL_MS,
	generateEmailVerificationToken,
	getEmailVerificationCooldownSeconds,
	getEmailVerificationExpiresAt,
	hashEmailVerificationToken,
	isEmailVerificationCooldownActive,
	isEmailVerificationExpired
} from './emailVerification';

describe('email verification token helpers', () => {
	it('generates a cryptographically random hex token', () => {
		const token = generateEmailVerificationToken();

		expect(token).toMatch(/^[a-f0-9]+$/);
		expect(token).toHaveLength(EMAIL_VERIFICATION_TOKEN_BYTES * 2);
		expect(generateEmailVerificationToken()).not.toBe(token);
	});

	it('hashes the token with SHA-256 without returning the raw token', () => {
		const token = 'verification-token';
		const hash = hashEmailVerificationToken(token);

		expect(hash).toBe(
			'46f6e828be35b9e2482ea7fc7a6a8f43f95a131098470486be3d137d408c8811'
		);
		expect(hash).not.toContain(token);
		expect(hash).toHaveLength(64);
	});

	it('sets a 24 hour expiration window', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');
		const expiresAt = getEmailVerificationExpiresAt(now);

		expect(expiresAt.getTime() - now.getTime()).toBe(EMAIL_VERIFICATION_TTL_MS);
	});

	it('detects expired tokens', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');

		expect(isEmailVerificationExpired(new Date('2026-07-10T11:59:59.000Z'), now)).toBe(true);
		expect(isEmailVerificationExpired(new Date('2026-07-10T12:00:00.000Z'), now)).toBe(true);
		expect(isEmailVerificationExpired(new Date('2026-07-10T12:00:01.000Z'), now)).toBe(false);
	});

	it('detects resend cooldown', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');
		const activeCooldown = new Date(now.getTime() - EMAIL_VERIFICATION_RESEND_COOLDOWN_MS + 1000);
		const expiredCooldown = new Date(now.getTime() - EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);

		expect(isEmailVerificationCooldownActive(activeCooldown, now)).toBe(true);
		expect(getEmailVerificationCooldownSeconds(activeCooldown, now)).toBe(1);
		expect(isEmailVerificationCooldownActive(expiredCooldown, now)).toBe(false);
		expect(isEmailVerificationCooldownActive(undefined, now)).toBe(false);
	});
});
