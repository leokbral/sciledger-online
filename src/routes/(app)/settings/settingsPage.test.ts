import { describe, expect, it } from 'vitest';

describe('settings +page.server.ts (landing route)', () => {
	it('always redirects /settings to /settings/account', async () => {
		const { load } = await import('./+page.server');

		await expect(load({} as any)).rejects.toMatchObject({
			status: 302,
			location: '/settings/account'
		});
	});
});
