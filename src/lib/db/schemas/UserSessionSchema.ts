import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const UserSessionSchema: Schema = new Schema(
	{
		_id: { type: String, default: () => crypto.randomUUID() },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		userId: { type: String, required: true, ref: 'User', index: true },
		sessionTokenHash: { type: String, required: true, unique: true, index: true },
		createdAt: { type: Date, default: () => new Date() },
		updatedAt: { type: Date, default: () => new Date() },
		lastActivityAt: { type: Date, default: () => new Date(), index: true },
		expiresAt: { type: Date, required: true, index: true },
		rememberMe: { type: Boolean, default: false },
		ip: { type: String, default: '' },
		userAgent: { type: String, default: '' },
		revokedAt: { type: Date, default: null },
		revokedReason: { type: String, default: '' }
	},
	{ collection: 'userSessions', timestamps: true }
);

UserSessionSchema.index({ userId: 1 });
UserSessionSchema.index({ sessionTokenHash: 1 }, { unique: true });
UserSessionSchema.index({ expiresAt: 1 });
UserSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
