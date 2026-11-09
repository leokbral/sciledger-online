import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { error, redirect } from '@sveltejs/kit';
import { loadSubmissionHub } from '$lib/server/submissionHub';

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

export async function load({ locals, url }) {
	if (!locals.user) redirect(302, '/login');
	
	await start_mongo();

	const [usersDoc, submissionHub] = await Promise.all([
		Users.find({}, {}).lean().exec(),
		loadSubmissionHub(url.searchParams.get('hubId'))
	]);

	return {
		users: sanitize(usersDoc),
		submissionHub
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
