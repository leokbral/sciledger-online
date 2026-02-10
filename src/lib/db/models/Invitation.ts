import type { Invitation } from '$lib/types/Invitation';
import mongoose from 'mongoose';
import { InvitationSchema } from '../schemas/Invitation';


export interface IInvitation extends Invitation, mongoose.Document {}

const InvitationModel = mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);
export default InvitationModel;
