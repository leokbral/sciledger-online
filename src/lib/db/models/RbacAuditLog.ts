import mongoose from 'mongoose';
import { RbacAuditLogSchema } from '../schemas/RbacAuditLogSchema';

export interface IRbacAuditLog extends mongoose.Document {
	id: string;
	userId?: string | null;
	action: string;
	hubId?: string | null;
	roleKey?: string | null;
	roleId?: string | null;
	targetUserId?: string | null;
	previousPermissions?: string[];
	newPermissions?: string[];
	metadata?: Record<string, unknown>;
	createdAt: Date;
}

const RbacAuditLog =
	mongoose.models.RbacAuditLog ||
	mongoose.model<IRbacAuditLog>('RbacAuditLog', RbacAuditLogSchema);

export default RbacAuditLog;
