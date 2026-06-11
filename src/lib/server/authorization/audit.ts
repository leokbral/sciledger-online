import type mongoose from 'mongoose';
import EditorialAuditLog from '$lib/db/models/EditorialAuditLog';
import { normalizeEntityId } from './roleResolver';

type AuditInput = {
	user?: any;
	roleKeys: string[];
	permissionKey: string;
	action: string;
	paperId?: string;
	hubId?: string;
	previousStatus?: string;
	newStatus?: string;
	metadata?: Record<string, unknown>;
	session?: mongoose.ClientSession | null;
};

export async function createEditorialAuditLog(input: AuditInput) {
	const userId = input.user ? normalizeEntityId(input.user) : null;

	const docs = await EditorialAuditLog.create(
		[
			{
				userId,
				roleKeys: input.roleKeys,
				permissionKey: input.permissionKey,
				action: input.action,
				paperId: input.paperId,
				hubId: input.hubId,
				previousStatus: input.previousStatus,
				newStatus: input.newStatus,
				metadata: input.metadata ?? {},
				createdAt: new Date()
			}
		],
		{ session: input.session ?? undefined }
	);

	return docs[0];
}
