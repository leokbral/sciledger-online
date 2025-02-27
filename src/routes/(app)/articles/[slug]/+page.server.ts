import Papers from '$lib/db/models/Paper';
import { redirect } from '@sveltejs/kit';


export async function load({ locals, params }) {

	const user = locals.user;
	if (!user) { redirect(302, '/login') }
	//console.log('vamo q vamo', params)

	const paper = await Papers.findOne({id:params.slug}, { _id: 0 }).lean().exec();
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
	return { paper};
}
