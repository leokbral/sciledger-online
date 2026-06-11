import mongoose from 'mongoose';
import { RoleSchema } from '../schemas/RoleSchema';

export interface IRole extends mongoose.Document {
	id: string;
	key: string;
	name: string;
	description?: string;
	permissions: string[];
	priority?: number;
	inheritsFrom?: string[];
	scopeType: 'global' | 'hub';
	scopeId?: string | null;
	isSystem: boolean;
	isProtected: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const Role = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
export default Role;
