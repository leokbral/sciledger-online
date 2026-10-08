import mongoose from 'mongoose';
import { OrcidSignupClaimSchema } from '../schemas/OrcidSignupClaimSchema';

export interface IOrcidSignupClaim extends mongoose.Document {
	id: string;
	orcid: string;
	firstName: string;
	lastName: string;
	pendingEmail?: string;
	tokenHash?: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const OrcidSignupClaim =
	mongoose.models.OrcidSignupClaim ||
	mongoose.model<IOrcidSignupClaim>('OrcidSignupClaim', OrcidSignupClaimSchema);

export default OrcidSignupClaim;
