import mongoose from 'mongoose';
import type { PaperReviewInvitation } from '$lib/types/PaperReviewInvitation';
import { PaperReviewInvitationSchema } from '../schemas/PaperReviewInvitation';

export interface IPaperReviewInvitation extends PaperReviewInvitation, mongoose.Document {}

const PaperReviewInvitationModel = mongoose.model<IPaperReviewInvitation>(
	'PaperReviewInvitation',
	PaperReviewInvitationSchema
);

export default PaperReviewInvitationModel;
