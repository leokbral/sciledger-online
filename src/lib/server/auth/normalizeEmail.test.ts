import { describe, expect, it } from 'vitest';
import { normalizeAndValidateEmail, normalizeEmail } from './normalizeEmail';

describe('normalizeEmail', () => {
	it('trims surrounding whitespace', () => {
		expect(normalizeEmail('  ada@example.com  ')).toBe('ada@example.com');
	});

	it('lowercases the email', () => {
		expect(normalizeEmail('Ada@EXAMPLE.com')).toBe('ada@example.com');
	});

	it('trims and lowercases together', () => {
		expect(normalizeEmail('  Ada.Lovelace@Example.COM  ')).toBe('ada.lovelace@example.com');
	});

	it('is idempotent', () => {
		const once = normalizeEmail('  Ada@Example.com ');
		expect(normalizeEmail(once)).toBe(once);
	});
});

describe('normalizeAndValidateEmail', () => {
	it('trims and lowercases a valid email', () => {
		expect(normalizeAndValidateEmail('  Ada@EXAMPLE.com  ')).toBe('ada@example.com');
	});

	it('rejects non-string input', () => {
		expect(normalizeAndValidateEmail(undefined)).toBeNull();
		expect(normalizeAndValidateEmail(null)).toBeNull();
		expect(normalizeAndValidateEmail(12345)).toBeNull();
		expect(normalizeAndValidateEmail({ email: 'ada@example.com' })).toBeNull();
	});

	it('rejects malformed email addresses', () => {
		expect(normalizeAndValidateEmail('not-an-email')).toBeNull();
		expect(normalizeAndValidateEmail('missing-domain@')).toBeNull();
		expect(normalizeAndValidateEmail('@missing-local.com')).toBeNull();
		expect(normalizeAndValidateEmail('no-at-sign.com')).toBeNull();
		expect(normalizeAndValidateEmail('spaces in@email.com')).toBeNull();
	});

	it('rejects emails longer than 254 characters', () => {
		const tooLong = `${'a'.repeat(250)}@example.com`;
		expect(tooLong.length).toBeGreaterThan(254);
		expect(normalizeAndValidateEmail(tooLong)).toBeNull();
	});

	it('accepts an email right at the 254 character limit', () => {
		const local = 'a'.repeat(242);
		const email = `${local}@example.com`; // exactly 254 chars
		expect(email.length).toBe(254);
		expect(normalizeAndValidateEmail(email)).toBe(email);
	});
});
