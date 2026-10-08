import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(here, '+page.svelte'), 'utf8');

/**
 * The server rejects any non-empty `email` field with a 400 ("Email changes
 * are not supported here"). A form that pre-fills the address and then posts
 * it back therefore makes the screen impossible to submit, while `required`
 * on the input blocks the only workaround of clearing it. These assertions
 * lock the form to the server's contract.
 */
describe('complete-profile +page.svelte', () => {
	it('does not submit an email field', () => {
		const payload = pageSource.slice(
			pageSource.indexOf("post('/complete-profile'"),
			pageSource.indexOf('if (response.success)')
		);

		expect(payload).not.toBe('');
		expect(payload).toContain('firstName');
		expect(payload).toContain('lastName');
		expect(payload).not.toMatch(/\bemail\b/);
	});

	it('renders the email as read-only rather than as an editable input', () => {
		expect(pageSource).not.toContain('bind:value={email}');
		expect(pageSource).not.toContain('type="email"');
	});

	it('routes email changes to the verified flow in account settings', () => {
		expect(pageSource).toContain('/settings/account');
	});

	it('offers placeholder-email accounts a way to set a real address', () => {
		expect(pageSource).toContain('isPlaceholderEmail');
	});

	it('recognizes placeholder addresses through the shared helper, not its own copy', () => {
		// A string do dominio mora apenas em $lib/helpers/orcidPlaceholderEmail.
		// Uma copia local aqui voltaria a divergir da semantica usada no servidor.
		expect(pageSource).toContain("from '$lib/helpers/orcidPlaceholderEmail'");
		expect(pageSource).toContain('isOrcidPlaceholderEmail(email)');
		expect(pageSource).not.toContain("'@orcid.placeholder'");
	});
});
