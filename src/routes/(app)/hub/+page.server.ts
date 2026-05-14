import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';

/**
 * Recursively converts MongoDB ObjectIds to strings for serialization
 */
function serializeData(data: unknown): unknown {
	if (data === null || data === undefined) {
		return data;
	}

	if (data instanceof Date) {
		return data.toISOString();
	}

	// Convert ObjectId to string
	if (typeof data === 'object' && data.constructor?.name === 'ObjectId') {
		return String(data);
	}

	if (Array.isArray(data)) {
		return data.map(serializeData);
	}

	if (typeof data === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data)) {
			result[key] = serializeData(value);
		}
		return result;
	}

	return data;
}

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
		users: serializeData(users),
		papers: serializeData(papers),
		reviews: serializeData(reviews),
		user: serializeData(user)
	};
}
