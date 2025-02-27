import '$lib/db/models/User';
import { page_size } from '$lib/constants';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
await start_mongo(); // Não necessário mais


export async function load({ /* locals, */ url }) {

	const tag = url.searchParams.get('tag');
	const page = +(url.searchParams.get('page') ?? '1');

	const q = new URLSearchParams();

	q.set('limit', page_size);
	q.set('offset', String((page - 1) * parseInt(page_size)));
	if (tag) q.set('tag', tag);


	const fetchPapers = async () => {
		const papers = await Papers.find({status: "published"}, { _id: 0 }).populate("mainAuthor").populate("coAuthors").lean().exec();
		return papers;
	};
	
	return {
		papers: await fetchPapers()
	};
}