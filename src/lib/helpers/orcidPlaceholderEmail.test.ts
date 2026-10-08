import { describe, expect, it } from 'vitest';
import {
	buildOrcidPlaceholderEmail,
	isOrcidPlaceholderEmail
} from './orcidPlaceholderEmail';

describe('buildOrcidPlaceholderEmail', () => {
	it('builds the deterministic address the ORCID callback stores', () => {
		expect(buildOrcidPlaceholderEmail('0000-0001-0002-0003')).toBe(
			'0000-0001-0002-0003@orcid.placeholder'
		);
	});

	it('round-trips with the recognizer', () => {
		expect(isOrcidPlaceholderEmail(buildOrcidPlaceholderEmail('0000-0001-0002-0003'))).toBe(true);
	});
});

describe('isOrcidPlaceholderEmail', () => {
	it('recognizes a placeholder address', () => {
		expect(isOrcidPlaceholderEmail('0000-0001-0002-0003@orcid.placeholder')).toBe(true);
	});

	it('normalizes casing and surrounding whitespace before comparing', () => {
		// Linhas gravadas antes da normalizacao de e-mail entrar no callback.
		expect(isOrcidPlaceholderEmail('  0000-0001-0002-0003@ORCID.Placeholder  ')).toBe(true);
	});

	it('rejects a real address', () => {
		expect(isOrcidPlaceholderEmail('ada@example.com')).toBe(false);
	});

	it('does not match a real address hosted on a subdomain of the placeholder name', () => {
		// Este e o caso que `includes('@orcid.placeholder')` errava: o dominio
		// real termina em .com, nao no dominio inexistente.
		expect(isOrcidPlaceholderEmail('bob@orcid.placeholder.com')).toBe(false);
	});

	it('does not match the domain appearing in the local part', () => {
		expect(isOrcidPlaceholderEmail('orcid.placeholder@example.com')).toBe(false);
	});

	it('treats a missing or non-string email as not a placeholder', () => {
		// Ausencia nao e placeholder -- quem precisa da distincao testa a
		// presenca do campo separadamente.
		expect(isOrcidPlaceholderEmail(undefined)).toBe(false);
		expect(isOrcidPlaceholderEmail(null)).toBe(false);
		expect(isOrcidPlaceholderEmail('')).toBe(false);
		expect(isOrcidPlaceholderEmail(42)).toBe(false);
	});
});
