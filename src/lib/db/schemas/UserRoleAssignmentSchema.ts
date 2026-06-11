import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const UserRoleAssignmentSchema: Schema = new Schema(
	{
		_id: { type: String, default: () => crypto.randomUUID() },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		userId: { type: String, required: true, ref: 'User', index: true },
		roleKey: { type: String, required: true, ref: 'Role', index: true },
		scopeType: {
			type: String,
			required: true,
			enum: ['global', 'hub', 'paper'],
			index: true
		},
		scopeId: { type: String, default: null, index: true },
		isActive: { type: Boolean, default: true, index: true },
		grantedBy: { type: String, ref: 'User' },
		createdAt: { type: Date, default: () => new Date() },
		updatedAt: { type: Date, default: () => new Date() }
	},
	{ collection: 'userRoleAssignments', timestamps: true }
);

UserRoleAssignmentSchema.index(
	{ userId: 1, roleKey: 1, scopeType: 1, scopeId: 1 },
	{ unique: true }
);
UserRoleAssignmentSchema.index({ roleKey: 1, scopeType: 1, scopeId: 1, isActive: 1 });
