import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';

export const POST: RequestHandler = async ({ params }) => {
	try {
		await start_mongo();
		const paperId = params.id;

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paperDoc: any = await Papers.findOne({ id: paperId });
		if (!paperDoc) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		// Only allow transition from corrections to second review round
		if (paperDoc.status !== 'needing corrections' && paperDoc.status !== 'under correction') {
			return json({ error: 'Paper is not in corrections phase' }, { status: 400 });
		}

		// Update to round 2 - keep 'in review' status but increment reviewRound
		paperDoc.status = 'in review';
		paperDoc.reviewRound = 2;

		// Update phase timestamps
		const existingPhaseTimestamps = (paperDoc.toObject?.() || {}).phaseTimestamps || {};
		const updatedPhaseTimestamps = {
			...existingPhaseTimestamps,
			correctionEnd: new Date(),
			round2Start: new Date()
		};
		paperDoc.set('phaseTimestamps', updatedPhaseTimestamps);

		await paperDoc.save();

		return json({ 
			success: true, 
			status: paperDoc.status,
			reviewRound: paperDoc.reviewRound,
			message: 'Paper submitted for second review round'
		});
	} catch (error) {
		console.error('Error moving paper to final review:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
