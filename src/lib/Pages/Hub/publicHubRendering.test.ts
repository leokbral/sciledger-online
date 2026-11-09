import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import PublicHubPage from './PublicHubPage.svelte';
import HubPage from './HubPage.svelte';

const hub = {
	_id: 'hub-1',
	id: 'hub-1',
	title: 'Research Hub',
	type: 'Journal',
	description: '<p>Research description</p>',
	location: 'online',
	issn: '1234-5678',
	guidelinesUrl: 'https://example.org/guide',
	acknowledgement: '',
	licenses: ['CC BY'],
	extensions: '',
	logoUrl: 'logo-1',
	bannerUrl: 'banner-1',
	cardUrl: 'card-1',
	peerReview: 'Everyone',
	authorInvite: 'Yes',
	identityVisibility: 'Hidden',
	reviewVisibility: 'Everyone',
	socialMedia: [],
	tracks: '',
	calendar: '',
	dates: {},
	status: 'open',
	publicationPolicy: ''
};

describe('public Hub pages', () => {
	it('renders Hub information, images and a login link with the submission destination', () => {
		const { body } = render(PublicHubPage, { props: { hub } });
		expect(body).toContain('Research description');
		expect(body).toContain('1234-5678');
		expect(body).toContain('/api/images/banner-1');
		expect(body).toContain('/api/images/logo-1');
		expect(body).toContain('/login?returnTo=%2Fpublish%2Fnew%3FhubId%3Dhub-1');
		expect(body).toContain('from=hub-submission');
		expect(body).toContain('from=hub-submission');
		expect(body).not.toContain('Open Hub workspace');
		expect(body).toContain('href="/paper-template.docx"');
		expect(body).toContain('Submit Manuscript');
		expect(body).not.toContain('Manuscript workspace');
	});

	it('takes logged-in visitors directly to the selected Hub submission', () => {
		const { body } = render(PublicHubPage, { props: { hub, loggedIn: true } });
		expect(body).toContain('href="/publish/new?hubId=hub-1"');
		expect(body).toContain('Submit Manuscript');
	});

	it('uses the existing manuscript cards and shows only published papers to guests', () => {
		const { body } = render(PublicHubPage, {
			props: {
				hub,
				papers: [
					{
						id: 'public-paper',
						title: 'Published research title',
						status: 'published',
						abstract: '<p>Public abstract</p>',
						keywords: ['Science']
					},
					{ id: 'private-paper', title: 'Private draft title', status: 'draft' }
				]
			}
		});
		expect(body).toContain('Published research title');
		expect(body).toContain('Public abstract');
		expect(body).toContain('Science');
		expect(body).toContain('href="/articles/public-paper"');
		expect(body).not.toContain('Private draft title');
		expect(body).not.toContain('Manage Reviewers');
		expect(body).not.toContain('Workspace</span>');
	});

	it('renders directory cards with their own submission button without a client-side fetch', () => {
		const { body } = render(HubPage, { props: { hubs: [hub] } });
		expect(body).toContain('Research Hub');
		expect(body).toContain('/api/images/card-1');
		expect(body).toContain('/hub/view/hub-1');
		expect(body).toContain('Submit a paper');
		expect(body).not.toContain('/hub/new');
		expect(body).toContain('href="/login"');
		expect(body).not.toContain('from=hub-submission');
		expect(body).not.toContain('from=hub-submission');
	});
});
