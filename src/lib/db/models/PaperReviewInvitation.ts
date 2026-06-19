import mongoose from 'mongoose';
import { PaperReviewInvitationSchema } from '../schemas/PaperReviewInvitation';

export interface IPaperReviewInvitation extends mongoose.Document {
	[key: string]: any;
}

// Delete existing model to force reload with updated schema
if (mongoose.models.PaperReviewInvitation) {
	delete mongoose.models.PaperReviewInvitation;
}

const PaperReviewInvitationModel = mongoose.model<IPaperReviewInvitation>(
	'PaperReviewInvitation',
	PaperReviewInvitationSchema
);

export default PaperReviewInvitationModel;
