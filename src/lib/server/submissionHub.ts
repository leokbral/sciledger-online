import { error } from '@sveltejs/kit';
import Hubs from '$lib/db/models/Hub';
import type { SubmissionHub } from '$lib/types/SubmissionHub';

/** Call after opening the database connection. Only load the destination's branding. */
export async function loadSubmissionHub(
	id: string | null | undefined
): Promise<SubmissionHub | null> {
	if (!id) return null;
	const hub = await Hubs.findById(id)
		.select('_id title type logoUrl bannerUrl cardUrl')
		.lean()
		.exec();
	if (!hub) error(404, 'Submission Hub not found');
	return {
		id: String(hub._id),
		title: String(hub.title || 'Untitled Hub'),
		type: String(hub.type || 'Hub'),
		logoUrl: String(hub.logoUrl || ''),
		bannerUrl: String(hub.bannerUrl || ''),
		cardUrl: String(hub.cardUrl || '')
	};
}
