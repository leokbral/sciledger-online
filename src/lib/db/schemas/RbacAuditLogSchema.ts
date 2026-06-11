import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const RbacAuditLogSchema: Schema = new Schema(
	{
		_id: { type: String, default: () => crypto.randomUUID() },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		userId: { type: String, ref: 'User', default: null },
		action: { type: String, required: true, index: true },
		hubId: { type: String, ref: 'Hub', default: null, index: true },
		roleKey: { type: String, default: null },
		roleId: { type: String, default: null },
		targetUserId: { type: String, ref: 'User', default: null },
		previousPermissions: [{ type: String }],
		newPermissions: [{ type: String }],
		metadata: { type: Schema.Types.Mixed, default: {} },
		createdAt: { type: Date, default: () => new Date(), index: true }
	},
	{ collection: 'rbacAuditLogs' }
);

RbacAuditLogSchema.index({ hubId: 1, createdAt: -1 });
RbacAuditLogSchema.index({ userId: 1, createdAt: -1 });
