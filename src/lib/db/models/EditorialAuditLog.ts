import mongoose from 'mongoose';
import { EditorialAuditLogSchema } from '../schemas/EditorialAuditLogSchema';

export interface IEditorialAuditLog extends mongoose.Document {
	id: string;
	userId?: string | null;
	roleKeys: string[];
	permissionKey: string;
	action: string;
	paperId?: string;
	hubId?: string;
	previousStatus?: string;
	newStatus?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
}

const EditorialAuditLog =
	mongoose.models.EditorialAuditLog ||
	mongoose.model<IEditorialAuditLog>('EditorialAuditLog', EditorialAuditLogSchema);

export default EditorialAuditLog;
