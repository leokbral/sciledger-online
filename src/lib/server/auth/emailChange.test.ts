import { describe, expect, it } from 'vitest';
import {
	EMAIL_CHANGE_RESEND_COOLDOWN_MS,
	EMAIL_CHANGE_TOKEN_BYTES,
	EMAIL_CHANGE_TTL_MS,
	generateEmailChangeToken,
	getEmailChangeConfirmationUrl,
	getEmailChangeCooldownSeconds,
	getEmailChangeExpiresAt,
	hashEmailChangeToken,
	isEmailChangeCooldownActive,
	isEmailChangeExpired,
	prepareEmailChange
} from './emailChange';

describe('email change token helpers', () => {
	it('generates a cryptographically random hex token', () => {
		const token = generateEmailChangeToken();

		expect(token).toMatch(/^[a-f0-9]+$/);
		expect(token).toHaveLength(EMAIL_CHANGE_TOKEN_BYTES * 2);
		expect(generateEmailChangeToken()).not.toBe(token);
	});

	it('hashes the token with SHA-256 without returning the raw token', () => {
		const token = 'email-change-token';
		const hash = hashEmailChangeToken(token);

		expect(hash).toBe('66acf7c07e0a601f6ae84fb1ce26815331947a1d7aaca7939e26cf6008256fc9');
		expect(hash).not.toContain(token);
		expect(hash).toHaveLength(64);
	});

	it('sets a 24 hour expiration window', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');
		const expiresAt = getEmailChangeExpiresAt(now);

		expect(expiresAt.getTime() - now.getTime()).toBe(EMAIL_CHANGE_TTL_MS);
	});

	it('detects expired tokens', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');

		expect(isEmailChangeExpired(new Date('2026-07-10T11:59:59.000Z'), now)).toBe(true);
		expect(isEmailChangeExpired(new Date('2026-07-10T12:00:00.000Z'), now)).toBe(true);
		expect(isEmailChangeExpired(new Date('2026-07-10T12:00:01.000Z'), now)).toBe(false);
	});

	it('detects a 60 second resend cooldown', () => {
		const now = new Date('2026-07-10T12:00:00.000Z');
		const activeCooldown = new Date(now.getTime() - EMAIL_CHANGE_RESEND_COOLDOWN_MS + 1000);
		const expiredCooldown = new Date(now.getTime() - EMAIL_CHANGE_RESEND_COOLDOWN_MS);

		expect(isEmailChangeCooldownActive(activeCooldown, now)).toBe(true);
		expect(getEmailChangeCooldownSeconds(activeCooldown, now)).toBe(1);
		expect(isEmailChangeCooldownActive(expiredCooldown, now)).toBe(false);
		expect(isEmailChangeCooldownActive(undefined, now)).toBe(false);
	});

	it('builds the confirmation URL under /confirm-email-change', () => {
		expect(getEmailChangeConfirmationUrl('https://sciledger.online', 'abc123')).toBe(
			'https://sciledger.online/confirm-email-change?token=abc123'
		);
		expect(getEmailChangeConfirmationUrl('https://sciledger.online/', 'abc123')).toBe(
			'https://sciledger.online/confirm-email-change?token=abc123'
		);
	});

	describe('prepareEmailChange', () => {
		it('stores only the token hash and returns the raw token separately', () => {
			const now = new Date('2026-07-10T12:00:00.000Z');
			const prepared = prepareEmailChange('new@example.com', now);

			expect(prepared.pendingEmail).toBe('new@example.com');
			expect(prepared.pendingEmailTokenHash).toBe(hashEmailChangeToken(prepared.token));
			expect(prepared.pendingEmailTokenHash).not.toBe(prepared.token);
			expect(prepared.pendingEmailExpiresAt).toEqual(getEmailChangeExpiresAt(now));
			expect(prepared.pendingEmailLastSentAt).toEqual(now);
		});

		it('generates a fresh token on every call, overwriting any previous request', () => {
			const now = new Date('2026-07-10T12:00:00.000Z');
			const first = prepareEmailChange('new@example.com', now);
			const second = prepareEmailChange('new@example.com', now);

			expect(second.token).not.toBe(first.token);
			expect(second.pendingEmailTokenHash).not.toBe(first.pendingEmailTokenHash);
		});
	});
});
