import type mongoose from 'mongoose';
import RbacAuditLog from '$lib/db/models/RbacAuditLog';
import { normalizeEntityId } from './roleResolver';

type RbacAuditInput = {
	user?: any;
	action: string;
	hubId?: string | null;
	roleKey?: string | null;
	roleId?: string | null;
	targetUserId?: string | null;
	previousPermissions?: string[];
	newPermissions?: string[];
	metadata?: Record<string, unknown>;
	session?: mongoose.ClientSession | null;
};

export async function createRbacAuditLog(input: RbacAuditInput) {
	const docs = await RbacAuditLog.create(
		[
			{
				userId: input.user ? normalizeEntityId(input.user) : null,
				action: input.action,
				hubId: input.hubId ?? null,
				roleKey: input.roleKey ?? null,
				roleId: input.roleId ?? null,
				targetUserId: input.targetUserId ?? null,
				previousPermissions: input.previousPermissions ?? [],
				newPermissions: input.newPermissions ?? [],
				metadata: input.metadata ?? {},
				createdAt: new Date()
			}
		],
		{ session: input.session ?? undefined }
	);

	return docs[0];
}
