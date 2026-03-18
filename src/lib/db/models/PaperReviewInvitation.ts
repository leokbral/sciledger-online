import mongoose from 'mongoose';
import type { PaperReviewInvitation } from '$lib/types/PaperReviewInvitation';
import { PaperReviewInvitationSchema } from '../schemas/PaperReviewInvitation';

export interface IPaperReviewInvitation extends PaperReviewInvitation, mongoose.Document {}

// Delete existing model to force reload with updated schema
if (mongoose.models.PaperReviewInvitation) {
	delete mongoose.models.PaperReviewInvitation;
}

const PaperReviewInvitationModel = mongoose.model<IPaperReviewInvitation>(
	'PaperReviewInvitation',
	PaperReviewInvitationSchema
);

export default PaperReviewInvitationModel;
