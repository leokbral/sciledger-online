import '$lib/db/models/User';
import { page_size } from '$lib/constants';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { sanitize } from '$lib/utils/sanitize'; // ✅ importe aqui

await start_mongo();

export async function load({ url }) {
	const stripHtml = (value: unknown) => {
		const raw = String(value ?? '');
		return raw
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	};

	const tag = url.searchParams.get('tag');
	const page = +(url.searchParams.get('page') ?? '1');

	const q = new URLSearchParams();

	q.set('limit', page_size);
	q.set('offset', String((page - 1) * parseInt(page_size)));
	if (tag) q.set('tag', tag);

	const fetchPapers = async () => {
		const papers = await Papers.find({ status: 'published' })
			.populate("mainAuthor")
			.populate("coAuthors")
			.lean()
			.exec();

		return sanitize(papers); // ✅ aqui está a mudança importante
	};

	const fetchHubShowcase = async () => {
		const [hubsRaw, publishedHubPapersRaw] = await Promise.all([
			Hubs.find(
				{},
				{
					_id: 1,
					id: 1,
					title: 1,
					type: 1,
					description: 1,
					status: 1,
					logoUrl: 1,
					bannerUrl: 1,
					cardUrl: 1,
					createdAt: 1
				}
			)
				.lean()
				.exec(),
			Papers.find(
				{ status: 'published', hubId: { $exists: true, $nin: [null, ''] } },
				{ _id: 1, id: 1, title: 1, hubId: 1, createdAt: 1 }
			)
				.sort({ createdAt: -1 })
				.lean()
				.exec()
		]);

		const papersByHub = new Map<string, Array<{ id: string; title: string; createdAt: string }>>();

		for (const paper of publishedHubPapersRaw) {
			const hubKey = String(paper.hubId ?? '');
			if (!hubKey) continue;

			if (!papersByHub.has(hubKey)) {
				papersByHub.set(hubKey, []);
			}

			papersByHub.get(hubKey)?.push({
				id: String(paper.id ?? paper._id),
				title: stripHtml(paper.title),
				createdAt: String(paper.createdAt ?? '')
			});
		}

		const hubShowcase = hubsRaw
			.map((hub) => {
				const hubKey = String(hub._id);
				const publishedPapers = papersByHub.get(hubKey) ?? [];

				return {
					_id: String(hub._id),
					id: String(hub.id ?? hub._id),
					title: String(hub.title ?? 'Untitled Hub'),
					type: String(hub.type ?? 'Hub'),
					description: String(hub.description ?? ''),
					status: String(hub.status ?? 'open'),
					logoUrl: hub.logoUrl ? String(hub.logoUrl) : '',
					bannerUrl: hub.bannerUrl ? String(hub.bannerUrl) : '',
					cardUrl: hub.cardUrl ? String(hub.cardUrl) : '',
					publishedCount: publishedPapers.length,
					recentPapers: publishedPapers.slice(0, 4)
				};
			})
			.filter((hub) => hub.publishedCount > 0)
			.sort((a, b) => b.publishedCount - a.publishedCount || a.title.localeCompare(b.title));

		return sanitize(hubShowcase);
	};

	return {
		papers: await fetchPapers(),
		hubShowcase: await fetchHubShowcase()
	};
}
