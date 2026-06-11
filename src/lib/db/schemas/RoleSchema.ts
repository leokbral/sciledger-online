import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const RoleSchema: Schema = new Schema(
	{
		_id: { type: String, default: () => crypto.randomUUID() },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		key: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		description: { type: String, default: '' },
		permissions: [{ type: String, required: true, trim: true }],
		priority: { type: Number, default: 0 },
		inheritsFrom: [{ type: String, trim: true }],
		scopeType: {
			type: String,
			enum: ['global', 'hub'],
			default: 'global',
			index: true
		},
		scopeId: { type: String, default: null, index: true },
		isSystem: { type: Boolean, default: false },
		isProtected: { type: Boolean, default: false },
		isActive: { type: Boolean, default: true },
		createdAt: { type: Date, default: () => new Date() },
		updatedAt: { type: Date, default: () => new Date() }
	},
	{ collection: 'roles', timestamps: true }
);

RoleSchema.index({ scopeType: 1, scopeId: 1, key: 1 }, { unique: true });
RoleSchema.index({ isActive: 1 });
