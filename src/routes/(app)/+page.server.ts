import '$lib/db/models/User';
import { page_size } from '$lib/constants';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
import { sanitize } from '$lib/utils/sanitize'; // ✅ importe aqui

await start_mongo();

export async function load({ url }) {
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

	return {
		papers: await fetchPapers()
	};
}
