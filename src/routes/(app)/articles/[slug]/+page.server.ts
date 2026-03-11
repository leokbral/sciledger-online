import Papers from '$lib/db/models/Paper';
import { error } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import { sanitize } from '$lib/utils/sanitize';
import '$lib/db/models/User';
import '$lib/db/models/Hub';


export async function load({ params }) {
	await start_mongo();

	const paper = await Papers.findOne({
		id: params.slug,
		status: 'published'
	}, { _id: 0 })
		.populate('mainAuthor')
		.populate('coAuthors')
		.populate('hubId')
		.lean()
		.exec();

	if (!paper) {
		throw error(404, 'Published article not found');
	}
	// const fetchArticles = async () => {
	// 	const articlesRes = await fetch(`https://api.realworld.io/api/articles/${params.slug}`);
	// 	const articlesData = await articlesRes.json();

	// 	return articlesData;
	// };

	// const fetchComments = async () => {
	// 	const commentsRes = await fetch(`https://api.realworld.io/api/articles/${params.slug}/comments`);
	// 	const commentsData = await commentsRes.json();
	// 	return commentsData;
	// };
	/* const [{ article }, { comments }] = await Promise.all([
		api.get(`articles/${params.slug}`, locals.user?.token),
		api.get(`articles/${params.slug}/comments`, locals.user?.token)
	]);

	const dirty = marked(article.body);
	article.body = sanitizeHtml(dirty); */

	// return { article: await fetchArticles(), comments: await fetchComments() };
	return { paper: sanitize(paper) };
}
