import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) throw redirect(302, '/login'); // ✅ corrigido

	await start_mongo();

	const fetchUsers = async () => {
		return await Users.find({}, {}).lean().exec();
	};

	const fetchPapers = async () => {
		const papersRaw = await Papers.find({})
			.populate("mainAuthor")
			.lean()
			.exec();

		const normalizedPapers = papersRaw.map(sanitizePaper);

		return normalizedPapers;
	};

	const fetchReviews = async (reviewerId: string) => {
		return await Reviews.find({ reviewer: reviewerId }).lean().exec();
	};

	const [users, papers, reviews] = await Promise.all([
		fetchUsers(),
		fetchPapers(),
		fetchReviews(user._id)
	]);

	return {
		users,
		papers,
		reviews,
		user
	};
}
