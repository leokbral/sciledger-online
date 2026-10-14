import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import { isDuplicateUsernameError, validateUsername } from '$lib/server/auth/username';

/**
 * Checks whether a username is free, and changes the CALLER'S OWN username.
 *
 * Scoped to the caller deliberately. A paper submitter must not be able to
 * rename another person's account from the submission form, and since ORCID
 * co-authors are no longer turned into accounts there, no generated username
 * exists for them to rename.
 *
 * Availability is reported without revealing anything else about the account
 * that holds the name.
 */

/** GET /api/account/username?value=@ada -- availability, for live feedback. */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user?.id) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const validation = validateUsername(url.searchParams.get('value'));
	if (!validation.ok) {
		return json({ available: false, reason: validation.reason }, { status: 200 });
	}

	await start_mongo();

	const owner = await Users.findOne({ username: validation.username })
		.select('id')
		.lean();

	// The caller's own current username counts as available: otherwise the form
	// would report a conflict with themselves while they are still typing.
	const isOwnUsername = !!owner && String((owner as any).id) === String(locals.user.id);

	return json({
		username: validation.username,
		available: !owner || isOwnUsername
	});
};

/** POST /api/account/username -- applies the change. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user?.id) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	let body: { username?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, { status: 400 });
	}

	const validation = validateUsername(body.username);
	if (!validation.ok) {
		return json({ error: validation.reason }, { status: 400 });
	}

	await start_mongo();

	const user = await Users.findOne({ $or: [{ id: locals.user.id }, { _id: locals.user.id }] });
	if (!user) {
		return json({ error: 'User not found.' }, { status: 404 });
	}

	if (user.username === validation.username) {
		return json({ username: user.username, changed: false });
	}

	const taken = await Users.findOne({ username: validation.username }).select('id').lean();
	if (taken && String((taken as any).id) !== String(user.id)) {
		return json({ error: 'That username is already taken.' }, { status: 409 });
	}

	user.username = validation.username;
	user.updatedAt = new Date().toISOString();

	try {
		await user.save();
	} catch (error) {
		// Two requests can both have seen the name as free; only one can win.
		// The unique index is the real arbiter, so a collision here is a 409,
		// not a 500.
		if (isDuplicateUsernameError(error)) {
			return json({ error: 'That username was just taken. Try another.' }, { status: 409 });
		}
		throw error;
	}

	return json({ username: user.username, changed: true });
};
