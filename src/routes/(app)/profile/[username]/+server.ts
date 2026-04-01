import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { fsFiles } from '$lib/db/fs';

const bucket = new GridFSBucket(db);

function extractImageIdFromUrl(url: string): string | null {
	const match = url.match(/\/api\/images\/([^/?#]+)/);
	return match?.[1] ?? null;
}

async function deleteImageIfUnused(profilePictureUrl: string, ownerUserId: string) {
	if (!profilePictureUrl) {
		return;
	}

	const imageId = extractImageIdFromUrl(profilePictureUrl);
	if (!imageId) {
		return;
	}

	const references = await Users.countDocuments({
		profilePictureUrl,
		id: { $ne: ownerUserId }
	});

	if (references > 0) {
		return;
	}

	const file = await fsFiles.findOne({ 'metadata.id': imageId });
	if (!file?._id) {
		return;
	}

	await bucket.delete(file._id);
}

export const PUT: RequestHandler = async ({ request, locals, params }) => {
	await start_mongo(); // Initialize database connection

	try {
		if (!locals.user) {
			return json({ error: 'Not authenticated.' }, { status: 401 });
		}

		const { id, position, institution, bio, profilePictureUrl } = await request.json();

		if (!id) {
			return json({ error: 'User ID is required.' }, { status: 400 });
		}

		// Check if user exists by ID
		const existingUser = await Users.findOne({ id });
		if (!existingUser) {
			return json({ error: 'User not found.' }, { status: 404 });
		}

		if (existingUser.username !== params.username) {
			return json({ error: 'Invalid user for this route.' }, { status: 400 });
		}

		if (existingUser.id !== locals.user.id) {
			return json({ error: 'No permission to modify this profile.' }, { status: 403 });
		}

		const updates: Record<string, unknown> = {
			updatedAt: new Date().toISOString()
		};

		if (typeof position === 'string') {
			updates.position = position.trim();
		}

		if (typeof institution === 'string') {
			updates.institution = institution.trim();
		}

		if (typeof bio === 'string') {
			updates.bio = bio.trim();
		}

		if (typeof profilePictureUrl === 'string') {
			updates.profilePictureUrl = profilePictureUrl.trim();
		}

		const previousProfilePictureUrl = existingUser.profilePictureUrl || '';
		const nextProfilePictureUrl =
			typeof updates.profilePictureUrl === 'string'
				? (updates.profilePictureUrl as string)
				: previousProfilePictureUrl;

		// Update user information
		const updatedUser = await Users.findOneAndUpdate(
			{ id },
			{ $set: updates },
			{ new: true } // Return the updated document
		)
			.select('-password -refreshToken -resetPasswordToken -resetPasswordExpiry -orcidAccessToken -orcidRefreshToken')
			.lean();

		if (!updatedUser) {
			return json({ error: 'User not found after update.' }, { status: 404 });
		}

		if (previousProfilePictureUrl !== nextProfilePictureUrl) {
			await deleteImageIfUnused(previousProfilePictureUrl, existingUser.id);
		}

		const cookiePayload = {
			user: {
				...locals.user,
				email: updatedUser.email,
				username: updatedUser.username,
				firstName: updatedUser.firstName,
				lastName: updatedUser.lastName,
				roles: updatedUser.roles,
				profilePictureUrl: updatedUser.profilePictureUrl,
				bio: updatedUser.bio,
				position: updatedUser.position,
				institution: updatedUser.institution
			},
			token: locals.token,
			refreshToken: locals.refreshToken
		};

		const cookieValue = Buffer.from(JSON.stringify(cookiePayload)).toString('base64');

		// Success response
		return json(
			{ user: updatedUser },
			{
				status: 200,
				headers: {
					'set-cookie': `jwt=${cookieValue}; Path=/; HttpOnly`
				}
			}
		);
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ error: 'Internal server error.' }, { status: 500 });
	}
};
