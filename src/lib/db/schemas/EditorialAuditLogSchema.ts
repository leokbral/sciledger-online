import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const EditorialAuditLogSchema: Schema = new Schema(
	{
		_id: { type: String, default: () => crypto.randomUUID() },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		userId: { type: String, ref: 'User', default: null },
		roleKeys: [{ type: String }],
		permissionKey: { type: String, required: true },
		action: { type: String, required: true },
		paperId: { type: String, ref: 'Paper' },
		hubId: { type: String, ref: 'Hub' },
		previousStatus: { type: String },
		newStatus: { type: String },
		metadata: { type: Schema.Types.Mixed, default: {} },
		createdAt: { type: Date, default: () => new Date() }
	},
	{ collection: 'editorialAuditLogs' }
);

EditorialAuditLogSchema.index({ paperId: 1, createdAt: -1 });
EditorialAuditLogSchema.index({ hubId: 1, createdAt: -1 });
EditorialAuditLogSchema.index({ userId: 1, createdAt: -1 });
EditorialAuditLogSchema.index({ action: 1, createdAt: -1 });
