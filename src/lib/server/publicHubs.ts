import sanitizeHtml from 'sanitize-html';
import { error } from '@sveltejs/kit';
import Hubs from '$lib/db/models/Hub';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';

// Public pages never load membership, invitations, assignments or unpublished papers.
export const PUBLIC_HUB_FIELDS =
	'id _id title type description location issn guidelinesUrl acknowledgement licenses extensions logoUrl bannerUrl cardUrl peerReview authorInvite identityVisibility reviewVisibility socialMedia tracks calendar showCalendar dates status createdAt publicationPolicy.text';

export function publicUrl(value: unknown): string {
	if (typeof value !== 'string') return '';
	try {
		const url = new URL(value);
		return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
	} catch {
		return '';
	}
}

export function publicHub(hub: Record<string, any>) {
	const richText = (value: unknown) => sanitizeHtml(String(value ?? ''));
	return {
		_id: String(hub._id),
		id: String(hub._id),
		title: String(hub.title || 'Untitled hub'),
		type: String(hub.type || 'Hub'),
		...(hub.createdAt ? { createdAt: String(hub.createdAt) } : {}),
		description: richText(hub.description),
		location: String(hub.location || 'online'),
		issn: String(hub.issn || ''),
		guidelinesUrl: publicUrl(hub.guidelinesUrl),
		acknowledgement: richText(hub.acknowledgement),
		licenses: Array.isArray(hub.licenses) ? hub.licenses.map(String) : [],
		extensions: richText(hub.extensions),
		logoUrl: String(hub.logoUrl || ''),
		bannerUrl: String(hub.bannerUrl || ''),
		cardUrl: String(hub.cardUrl || ''),
		peerReview: String(hub.peerReview || 'Everyone'),
		authorInvite: String(hub.authorInvite || 'Yes'),
		identityVisibility: String(hub.identityVisibility || 'Everyone'),
		reviewVisibility: String(hub.reviewVisibility || 'Everyone'),
		socialMedia: Object.entries(hub.socialMedia || {})
			.map(([name, value]) => ({ name, url: publicUrl(value) }))
			.filter((link) => link.url),
		tracks: richText(hub.tracks),
		calendar: hub.showCalendar ? richText(hub.calendar) : '',
		dates: Object.fromEntries(
			Object.entries(hub.dates || {}).flatMap(([key, value]) => {
				const date = new Date(String(value));
				return Number.isNaN(date.getTime()) ? [] : [[key, date.toISOString()]];
			})
		),
		status: String(hub.status || 'open'),
		publicationPolicy: richText(hub.publicationPolicy?.text)
	};
}

export type PublicHub = ReturnType<typeof publicHub>;

export async function loadPublicHubs() {
	await start_mongo();
	const hubs = await Hubs.find().select(PUBLIC_HUB_FIELDS).sort({ createdAt: -1 }).lean().exec();
	return hubs.map(publicHub);
}

export async function loadPublicHub(id: string) {
	await start_mongo();
	const hub = await Hubs.findById(id).select(PUBLIC_HUB_FIELDS).lean().exec();
	if (!hub) error(404, 'Hub not found');
	const papers = await Papers.find({ hubId: String(hub._id), status: 'published' })
		.select('_id id title abstract keywords createdAt mainAuthor coAuthors')
		.populate('mainAuthor', '_id id firstName lastName username')
		.populate('coAuthors', '_id id firstName lastName username')
		.sort({ createdAt: -1 })
		.lean()
		.exec();
	return {
		isPublic: true as const,
		hub: publicHub(hub),
		publishedPapers: papers.map((paper) => ({
			_id: String(paper._id),
			id: String(paper.id || paper._id),
			status: 'published' as const,
			createdAt: paper.createdAt ? new Date(paper.createdAt).toISOString() : null,
			abstract: sanitizeHtml(String(paper.abstract || '')),
			keywords: Array.isArray(paper.keywords) ? paper.keywords.map(String) : [],
			mainAuthor: publicAuthor(paper.mainAuthor),
			coAuthors: Array.isArray(paper.coAuthors)
				? paper.coAuthors.map(publicAuthor).filter(Boolean)
				: [],
			title: sanitizeHtml(String(paper.title || 'Untitled paper'), {
				allowedTags: [],
				allowedAttributes: {}
			})
		}))
	};
}

function publicAuthor(value: any) {
	if (!value || typeof value !== 'object') return null;
	return {
		_id: String(value._id || value.id || ''),
		id: String(value.id || value._id || ''),
		firstName: String(value.firstName || ''),
		lastName: String(value.lastName || ''),
		username: String(value.username || '')
	};
}
