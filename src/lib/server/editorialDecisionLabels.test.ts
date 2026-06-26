import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walkSvelteFiles(directory: string): string[] {
	const entries = readdirSync(directory);
	return entries.flatMap((entry) => {
		const path = join(directory, entry);
		const stats = statSync(path);
		if (stats.isDirectory()) return walkSvelteFiles(path);
		return path.endsWith('.svelte') ? [path] : [];
	});
}

describe('editorial decision UI labels', () => {
	it('does not render legacy Reject labels in Svelte UI text', () => {
		const files = [...walkSvelteFiles('src/routes'), ...walkSvelteFiles('src/lib')];
		const forbiddenLabelPatterns = [
			/>\s*Reject(?:\s+Paper)?\s*</,
			/>\s*Rejected\s*</,
			/Reject Paper/,
			/Rejecting\.\.\./,
			/Reject publication/,
			/Paper Rejected/,
			/Rejection Reason/,
			/Rejected on/
		];

		const offenders = files.filter((file) => {
			const content = readFileSync(file, 'utf8');
			return forbiddenLabelPatterns.some((pattern) => pattern.test(content));
		});

		expect(offenders).toEqual([]);
	});
});
