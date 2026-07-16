import mongoose from 'mongoose';
import { UserSessionSchema } from '../schemas/UserSessionSchema';

export interface IUserSession extends mongoose.Document {
	id: string;
	userId: string;
	sessionTokenHash: string;
	createdAt: Date;
	updatedAt: Date;
	lastActivityAt: Date;
	expiresAt: Date;
	rememberMe: boolean;
	ip?: string;
	userAgent?: string;
	revokedAt?: Date | null;
	revokedReason?: string;
}

const UserSession =
	mongoose.models.UserSession ||
	mongoose.model<IUserSession>('UserSession', UserSessionSchema);

export default UserSession;
