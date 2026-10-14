import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(here, 'PaperPublishPage.svelte'), 'utf8');

/**
 * Adding a co-author by ORCID used to create a real account and mail the
 * person from this unsaved form, then show a plaintext temporary password in
 * an alert(). Abandoning the draft did not undo any of it.
 *
 * The submission form must now cause no side effect at all; inviting is the
 * server's job, after the draft is persisted.
 */
describe('PaperPublishPage author invitations', () => {
	it('never creates an account while the author is being picked', () => {
		expect(pageSource).not.toContain("fetch('/api/orcid/add-user'");
		expect(pageSource).not.toContain('/api/orcid/add-user?');
	});

	it('never sends a co-author email from the form', () => {
		expect(pageSource).not.toContain("fetch('/api/email/coauthor'");
	});

	it('never handles or displays a temporary password', () => {
		// Asserted against code, not prose: the comment explaining the old
		// behaviour legitimately names it, and matching that would fail for the
		// wrong reason.
		const code = pageSource
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/(^|\n)\s*\/\/.*/g, '');

		expect(code).not.toMatch(/tempPassword/);
		expect(code).not.toMatch(/passwordInfo/);
		expect(code).not.toMatch(/Temporary password/i);
	});

	it('holds authors without an account in submission state instead', () => {
		expect(pageSource).toContain('pendingAuthors');
		expect(pageSource).toContain('addPendingAuthor');
	});

	it('hands the pending authors to the server with the paper, not before', () => {
		const saveBlock = pageSource.slice(
			pageSource.indexOf('$store.paperPictures = coverImageIds'),
			pageSource.indexOf('return $store;')
		);

		expect(saveBlock).not.toBe('');
		expect(saveBlock).toContain('pendingAuthorInvitations');
		expect(saveBlock).toContain('savePaper($store)');
		// The assignment must precede the save, or the first save would carry none.
		expect(saveBlock.indexOf('pendingAuthorInvitations')).toBeLessThan(
			saveBlock.indexOf('savePaper($store)')
		);
	});

	it('offers a third way in: straight by email', () => {
		// Previously an author with neither an account nor an ORCID record could
		// not be named at all -- the email field only existed inside the ORCID flow.
		expect(pageSource).toContain('addPendingAuthorByEmail');
		expect(pageSource).toContain('pendingAuthorEmail');
	});

	it('tells the user invitations wait for the save', () => {
		expect(pageSource).toMatch(/after you save the draft/i);
	});

	it('no longer promises that missing users are registered automatically', () => {
		expect(pageSource).not.toMatch(/they'll be added automatically/i);
	});
});
