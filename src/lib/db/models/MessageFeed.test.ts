import { describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

describe('MessageFeed model registration', () => {
	it('reuses the compiled model after a module reload', async () => {
		const first = (await import('./MessageFeed')).default;
		vi.resetModules();
		const reloaded = (await import('./MessageFeed')).default;

		expect(reloaded).toBe(first);
		expect(mongoose.models.MessageFeed).toBe(first);
	});
});
