import mongoose from 'mongoose';
import { UserRoleAssignmentSchema } from '../schemas/UserRoleAssignmentSchema';

export type RoleScopeType = 'global' | 'hub' | 'paper';

export interface IUserRoleAssignment extends mongoose.Document {
	id: string;
	userId: string;
	roleKey: string;
	scopeType: RoleScopeType;
	scopeId?: string | null;
	isActive: boolean;
	grantedBy?: string;
	createdAt: Date;
	updatedAt: Date;
}

const UserRoleAssignment =
	mongoose.models.UserRoleAssignment ||
	mongoose.model<IUserRoleAssignment>('UserRoleAssignment', UserRoleAssignmentSchema);

export default UserRoleAssignment;
