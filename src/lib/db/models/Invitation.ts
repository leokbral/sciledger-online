import type { Invitation } from '$lib/types/Invitation';
import mongoose from 'mongoose';
import { InvitationSchema } from '../schemas/Invitation';


export interface IInvitation extends Invitation, mongoose.Document {}

const cachedInvitationModel = mongoose.models.Invitation as mongoose.Model<IInvitation> | undefined;

if (cachedInvitationModel && !cachedInvitationModel.schema.path('role')) {
	mongoose.deleteModel('Invitation');
}

const InvitationModel = mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);
export default InvitationModel;
