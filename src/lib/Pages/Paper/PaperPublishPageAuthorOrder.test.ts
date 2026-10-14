import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(here, 'PaperPublishPage.svelte'), 'utf8');

/**
 * Author order has no field of its own: `inputAuthorList` IS the order, and the
 * save turns position 0 into `mainAuthor` and the rest into `coAuthors`.
 * Reordering therefore has to be a pure array move, and must not disturb
 * anything else on the submission.
 */
describe('PaperPublishPage author ordering', () => {
	it('reorders by moving within the author array, nothing else', () => {
		const fn = pageSource.slice(
			pageSource.indexOf('function moveAuthor('),
			pageSource.indexOf('let draggingAuthorIndex')
		);

		expect(fn).not.toBe('');
		expect(fn).toContain('splice');
		expect(fn).toContain('inputAuthorList = next');

		// The move must not touch the document, the extracted metadata, the
		// preview, the affiliations or the corresponding author.
		for (const forbidden of [
			'$store.title',
			'$store.abstract',
			'$store.keywords',
			'$store.content',
			'content =',
			'docxFile',
			'authorAffiliations =',
			'resetExtractedDocumentMetadata'
		]) {
			expect(fn).not.toContain(forbidden);
		}
	});

	it('guards both ends of the array', () => {
		const fn = pageSource.slice(
			pageSource.indexOf('function moveAuthor('),
			pageSource.indexOf('let draggingAuthorIndex')
		);

		expect(fn).toContain('from < 0');
		expect(fn).toContain('inputAuthorList.length');
	});

	it('offers drag and drop', () => {
		expect(pageSource).toContain('draggable="true"');
		expect(pageSource).toContain('ondragstart');
		expect(pageSource).toContain('ondrop');
		// A drop must not navigate or submit.
		expect(pageSource).toContain('event.preventDefault()');
	});

	it('offers a pointer-free route to the same reorder', () => {
		// A drag is unusable by keyboard and by a screen reader, so the arrow
		// buttons are not decoration -- they are the accessible path.
		expect(pageSource).toMatch(/Move \$\{username\} earlier/);
		expect(pageSource).toMatch(/Move \$\{username\} later/);
		expect(pageSource).toContain('moveAuthor(authorIndex, authorIndex - 1)');
		expect(pageSource).toContain('moveAuthor(authorIndex, authorIndex + 1)');
	});

	it('puts the author list above the search box, inside the Authors area', () => {
		// Not down in the affiliations cards: the order belongs where the authors
		// are chosen. And above the input, so the list reads as the result and
		// the box below it as the way to add to it.
		const authorsArea = pageSource.indexOf('<section id="authors"');
		const affiliationsArea = pageSource.indexOf('Add at least one author to fill affiliation details');
		const dragChip = pageSource.indexOf('draggable="true"');
		const searchBox = pageSource.indexOf('<TagsInput');

		expect(authorsArea).toBeGreaterThan(-1);
		expect(dragChip).toBeGreaterThan(authorsArea);
		expect(dragChip).toBeLessThan(searchBox);
		expect(searchBox).toBeLessThan(affiliationsArea);
	});

	it('shows which author is the main one and highlights the drop target', () => {
		expect(pageSource).toContain('The first author is the main author');
		expect(pageSource).toContain('dropTargetIndex');
	});

	it('lists each author exactly once: the input box shows no chips of its own', () => {
		// The TagsInput used to render its own chip per author, so the same
		// authors appeared twice -- once in the box, once in the draggable row.
		// Hiding its tag list makes the draggable row the only list.
		const tagsInput = pageSource.slice(
			pageSource.indexOf('<TagsInput'),
			pageSource.indexOf('></TagsInput>')
		);

		expect(tagsInput).not.toBe('');
		expect(tagsInput).toContain('tagListClasses="hidden"');
	});

	it('renders the list from a single author, not only from two', () => {
		// With the box's chips hidden, a lone author would otherwise be invisible.
		const guard = pageSource.indexOf('{#if inputAuthorList.length > 0}');

		expect(guard).toBeGreaterThan(-1);
		expect(guard).toBeLessThan(pageSource.indexOf('draggable="true"'));
	});

	it('carries the removal the hidden chips used to provide', () => {
		expect(pageSource).toMatch(/Remove \$\{username\}/);
		expect(pageSource).toContain('removeAuthor(authorIndex)');
	});

	it('keeps affiliations in step when an author is removed', () => {
		// Dropping a username has to re-run the sync, or the removed author's
		// affiliation record would stay behind on the submission.
		const fn = pageSource.slice(
			pageSource.indexOf('function removeAuthor('),
			pageSource.indexOf('function removePendingAuthor(')
		);

		expect(fn).not.toBe('');
		expect(fn).toContain('syncAuthorAffiliationsForUsernames(inputAuthorList)');
		expect(fn).toContain('index < 0');
	});

	it('states that order is authorship, instead of leaving it to the badge', () => {
		expect(pageSource).toMatch(/order defines the authorship/i);
	});

	it('keeps affiliations keyed by username, not by position', () => {
		// This is why a reorder cannot lose affiliations: the record is not
		// indexed by order, so moving the array leaves it untouched.
		expect(pageSource).toContain('authorAffiliations = $state<Record<string, AuthorAffiliationForm>>');
		expect(pageSource).toContain('authorAffiliations[username]');
	});

	it('still derives the main author from position 0 on save', () => {
		expect(pageSource).toContain('$store.mainAuthor = $store.authors[0]');
	});
});
