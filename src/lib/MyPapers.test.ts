import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const myPapers = readFileSync(resolve(here, 'MyPapers.svelte'), 'utf8');

describe('MyPapers draft deletion guardrails', () => {
	it('shows draft deletion only for drafts and confirms before calling the delete endpoint', () => {
		expect(myPapers).toContain("paper.status === 'draft'");
		expect(myPapers).toContain('Delete draft?');
		expect(myPapers).toContain('This action cannot be undone.');
		expect(myPapers).toContain("method: 'DELETE'");
		expect(myPapers).toContain('/api/papers/${encodeURIComponent(draftToDelete.id)}');
		expect(myPapers).toContain('papersData = papersData.filter');
		expect(myPapers).toContain('isDeletingDraft');
		expect(myPapers).toContain('deleteDraftError');
	});
});
