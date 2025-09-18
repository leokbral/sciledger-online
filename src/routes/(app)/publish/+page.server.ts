import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import Papers from '$lib/db/models/Paper';
import { redirect } from '@sveltejs/kit';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// Função de sanitização
function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}
	
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	}
	
	if (obj && typeof obj === 'object') {
		// Handle MongoDB ObjectId
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}
		
		// Handle Date objects
		if (obj instanceof Date) {
			return obj.toISOString();
		}
		
		// Handle regular objects
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = (obj as Record<string, unknown>)[key];
				clean[key] = sanitize(value);
			}
		}
		return clean;
	}
	
	return obj;
}

export async function load({ locals }) {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    await start_mongo();

    const usersDoc = await Users.find({}, {}).lean().exec();

    const papersDoc = await Papers.find({
        $or: [
            { coAuthors: user.id },
            { mainAuthor: user.id },
            { correspondingAuthor: user.id }
        ]
    })
        .populate("mainAuthor")
        .populate("coAuthors")
        .populate("correspondingAuthor")
        .populate({
            path: 'peer_review.reviews',
            populate: {
                path: 'reviewerId',
                model: 'User'
            }
        })
        .lean()
        .exec();

    const normalizedPapers = papersDoc.map((paper) => {
        const peer_review = paper.peer_review
            ? {
                reviewType: paper.peer_review.reviewType,
                assignedReviewers: paper.peer_review.assignedReviewers ?? [],
                responses: paper.peer_review.responses ?? [],
                reviews: paper.peer_review.reviews ?? [],
                averageScore: paper.peer_review.averageScore ?? 0,
                reviewCount: paper.peer_review.reviewCount ?? 0,
                reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
            }
            : {
                reviewType: 'open',
                assignedReviewers: [],
                responses: [],
                reviews: [],
                averageScore: 0,
                reviewCount: 0,
                reviewStatus: 'not_started'
            };

        return {
            ...paper,
            peer_review
        };
    });

    return {
        users: sanitize(usersDoc),
        papers: sanitize(normalizedPapers),
        user: sanitize(user)
    };
}
