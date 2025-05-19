import Invitation from '$lib/db/models/Invitation';
import { json } from '@sveltejs/kit';
import crypto from 'crypto';

export async function POST({ request }) {
	try {
		const { hubId, reviewerId } = await request.json();
		console.log('Received data:', { hubId, reviewerId });

		const id = crypto.randomUUID();

		const invitation = new Invitation({
			_id: id,
			id,
			reviewer: reviewerId,
			hubId,
			status: 'pending',
			assignedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await invitation.save();

		return json({ success: true, invitation });
	} catch (error) {
		console.error('Error creating invitation:', error);
		return json({
			error: 'Failed to create invitation',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
}

export async function GET({ locals }) {
	try {
		const user = locals.user; // use isso se você já está definindo o usuário em hooks.server.ts

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const invitations = await Invitation.find({ reviewer: user.id });

		return json({ success: true, invitations });
	} catch (error) {
		console.error('Error fetching invitations:', error);
		return json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
}
