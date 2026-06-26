import { describe, expect, it } from 'vitest';
import { hasHubPublication } from './paperPublicationModel';

describe('paper publication model helpers', () => {
	it('detects hub publications from hubId, hub reference, or linked flag', () => {
		expect(hasHubPublication({ hubId: 'hub-1' })).toBe(true);
		expect(hasHubPublication({ hubId: { _id: 'hub-1', title: 'Hub' } })).toBe(true);
		expect(hasHubPublication({ hub: { id: 'hub-1' } })).toBe(true);
		expect(hasHubPublication({ isLinkedToHub: true })).toBe(true);
	});

	it('treats papers without hub association as independent publications', () => {
		expect(hasHubPublication({})).toBe(false);
		expect(hasHubPublication({ hubId: null, isLinkedToHub: false })).toBe(false);
		expect(hasHubPublication({ hubId: '' })).toBe(false);
	});
});
