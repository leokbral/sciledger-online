import type mongoose from 'mongoose';
import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import { start_mongo } from '$lib/db/mongooseConnection';
import { ensureHubRoles } from './bootstrapRbac';
import { roleInheritsRole } from './roleInheritance';
import { createRbacAuditLog } from './rbacAudit';
import { emitEvent } from '$lib/services/EventService';

type AssignHighestHubRoleOptions = {
	auditUser?: any;
	session?: mongoose.ClientSession | null;
	audit?: boolean;
};

type RevokeHubRoleAssignmentsOptions = {
	auditUser?: any;
	session?: mongoose.ClientSession | null;
	audit?: boolean;
	roleKeys?: string[];
};

export type AssignHighestHubRoleResult = {
	assignment: any | null;
	roleKey: string;
	userId: string;
	hubId: string;
	coveredByRoleKey?: string;
	supersededRoleKeys: string[];
};

export class HubRoleRevocationError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = 'hub_role_revocation_failed') {
		super(message);
		this.name = 'HubRoleRevocationError';
		this.status = status;
		this.code = code;
	}
}

const HUB_ROLE_ALIASES: Record<string, string> = {
	reviewer: 'Reviewer',
	associate_editor: 'AssociateEditor',
	associateEditor: 'AssociateEditor',
	editor_chief: 'EditorChief',
	editorChief: 'EditorChief',
	vice_manager: 'EditorChief',
	ManagingEditor: 'EditorChief',
	hub_owner: 'HubOwner',
	hubOwner: 'HubOwner'
};

export function normalizeHubRoleKey(roleKey: string) {
	const trimmed = String(roleKey || '').trim();
	return HUB_ROLE_ALIASES[trimmed] ?? trimmed;
}

function normalizeIds(values: string[]) {
	return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export async function assignHighestHubRole(
	userId: string,
	hubId: string,
	roleKey: string,
	grantedBy: string,
	options: AssignHighestHubRoleOptions = {}
): Promise<AssignHighestHubRoleResult> {
	await start_mongo();

	const normalizedUserId = String(userId || '').trim();
	const normalizedHubId = String(hubId || '').trim();
	const normalizedRoleKey = normalizeHubRoleKey(roleKey);
	const session = options.session ?? null;

	if (!normalizedUserId || !normalizedHubId || !normalizedRoleKey) {
		throw new Error('userId, hubId and roleKey are required to assign a hub role');
	}

	await ensureHubRoles(normalizedHubId);

	const [role, hubRoles, activeAssignments] = await Promise.all([
		Role.findOne({
			key: normalizedRoleKey,
			scopeType: 'hub',
			scopeId: normalizedHubId,
			isActive: true
		})
			.session(session)
			.lean(),
		Role.find({ scopeType: 'hub', scopeId: normalizedHubId, isActive: true })
			.session(session)
			.lean(),
		UserRoleAssignment.find({
			userId: normalizedUserId,
			scopeType: 'hub',
			scopeId: normalizedHubId,
			isActive: true
		})
			.session(session)
			.lean()
	]);

	if (!role) {
		throw new Error(`Role ${normalizedRoleKey} was not found in hub ${normalizedHubId}`);
	}

	const rolesByKey = new Map<string, any>(
		hubRoles.map((hubRole: any) => [String(hubRole.key), hubRole])
	);

	const coveringAssignment = activeAssignments.find(
		(assignment: any) => {
			const existingRoleKey = normalizeHubRoleKey(String(assignment.roleKey));
			return (
				existingRoleKey !== normalizedRoleKey &&
				roleInheritsRole(existingRoleKey, normalizedRoleKey, rolesByKey)
			);
		}
	);

	if (coveringAssignment) {
		const coveringRoleKey = normalizeHubRoleKey(String(coveringAssignment.roleKey));
		const canonicalCoveringAssignment =
			String(coveringAssignment.roleKey) === coveringRoleKey
				? coveringAssignment
				: await UserRoleAssignment.findOneAndUpdate(
						{
							userId: normalizedUserId,
							roleKey: coveringRoleKey,
							scopeType: 'hub',
							scopeId: normalizedHubId
						},
						{
							$set: {
								isActive: true,
								grantedBy,
								updatedAt: new Date()
							},
							$setOnInsert: {
								userId: normalizedUserId,
								roleKey: coveringRoleKey,
								scopeType: 'hub',
								scopeId: normalizedHubId,
								createdAt: new Date()
							}
						},
						{
							upsert: true,
							new: true,
							setDefaultsOnInsert: true,
							session: session ?? undefined
						}
					);

		await deactivateSupersededAssignments({
			activeAssignments,
			auditUser: options.auditUser ?? grantedBy,
			hubId: normalizedHubId,
			roleKey: coveringRoleKey,
			rolesByKey,
			session,
			targetUserId: normalizedUserId,
			writeAudit: options.audit !== false
		});

		return {
			assignment: canonicalCoveringAssignment,
			roleKey: normalizedRoleKey,
			userId: normalizedUserId,
			hubId: normalizedHubId,
			coveredByRoleKey: coveringRoleKey,
			supersededRoleKeys: []
		};
	}

	const existingAssignment = await UserRoleAssignment.findOne({
		userId: normalizedUserId,
		roleKey: normalizedRoleKey,
		scopeType: 'hub',
		scopeId: normalizedHubId
	})
		.session(session)
		.lean();

	const assignment = await UserRoleAssignment.findOneAndUpdate(
		{
			userId: normalizedUserId,
			roleKey: normalizedRoleKey,
			scopeType: 'hub',
			scopeId: normalizedHubId
		},
		{
			$set: {
				isActive: true,
				grantedBy,
				updatedAt: new Date()
			},
			$setOnInsert: {
				userId: normalizedUserId,
				roleKey: normalizedRoleKey,
				scopeType: 'hub',
				scopeId: normalizedHubId,
				createdAt: new Date()
			}
		},
		{ upsert: true, new: true, setDefaultsOnInsert: true, session: session ?? undefined }
	);

	const inheritedAssignments = await deactivateSupersededAssignments({
		activeAssignments,
		auditUser: options.auditUser ?? grantedBy,
		hubId: normalizedHubId,
		roleKey: normalizedRoleKey,
		rolesByKey,
		session,
		targetUserId: normalizedUserId,
		writeAudit: false
	});

	if (options.audit !== false) {
		const auditUser = options.auditUser ?? grantedBy;
		const assignmentAction = existingAssignment?.isActive
			? 'role.assignment.updated'
			: 'role.assignment.created';

		await createRbacAuditLog({
			user: auditUser,
			action: assignmentAction,
			hubId: normalizedHubId,
			roleKey: normalizedRoleKey,
			targetUserId: normalizedUserId,
			metadata: {
				grantedBy
			},
			session
		});

		for (const existingHubAssignment of inheritedAssignments) {
			await createRbacAuditLog({
				user: auditUser,
				action: 'role.assignment.superseded',
				hubId: normalizedHubId,
				roleKey: existingHubAssignment.roleKey,
				targetUserId: normalizedUserId,
				metadata: {
					supersededBy: normalizedRoleKey
				},
				session
			});
		}
	}

	if (!existingAssignment?.isActive) {
		try {
			await emitEvent({
				type: 'role.assigned',
				actorId: grantedBy,
				recipients: [normalizedUserId],
				entityType: 'role',
				entityId: String(assignment._id || assignment.id || normalizedRoleKey),
				metadata: {
					hubId: normalizedHubId,
					roleKey: normalizedRoleKey,
					roleName: role.name,
					targetUserId: normalizedUserId,
					grantedBy,
					supersededRoleKeys: inheritedAssignments.map((assignmentRow: any) =>
						String(assignmentRow.roleKey)
					),
					recipientRoles: {
						[normalizedUserId]: 'target'
					}
				}
			});
		} catch (eventError) {
			console.error('Failed to emit role assigned event:', eventError);
		}
	}

	return {
		assignment,
		roleKey: normalizedRoleKey,
		userId: normalizedUserId,
		hubId: normalizedHubId,
		supersededRoleKeys: inheritedAssignments.map((assignmentRow: any) =>
			String(assignmentRow.roleKey)
		)
	};
}

async function deactivateSupersededAssignments(input: {
	activeAssignments: any[];
	auditUser: any;
	hubId: string;
	roleKey: string;
	rolesByKey: Map<string, any>;
	session: mongoose.ClientSession | null;
	targetUserId: string;
	writeAudit: boolean;
}) {
	const inheritedAssignments = input.activeAssignments.filter((existingHubAssignment: any) => {
		const rawRoleKey = String(existingHubAssignment.roleKey);
		const existingRoleKey = normalizeHubRoleKey(rawRoleKey);
		return (
			rawRoleKey !== input.roleKey &&
			(existingRoleKey === input.roleKey ||
				roleInheritsRole(input.roleKey, existingRoleKey, input.rolesByKey))
		);
	});
	const inheritedAssignmentIds = inheritedAssignments
		.map((existingHubAssignment: any) => existingHubAssignment._id || existingHubAssignment.id)
		.filter(Boolean);

	if (inheritedAssignmentIds.length > 0) {
		await UserRoleAssignment.updateMany(
			{ _id: { $in: inheritedAssignmentIds }, scopeType: 'hub', scopeId: input.hubId },
			{ $set: { isActive: false, updatedAt: new Date() } },
			{ session: input.session ?? undefined }
		);
	}

	if (input.writeAudit) {
		for (const existingHubAssignment of inheritedAssignments) {
			await createRbacAuditLog({
				user: input.auditUser,
				action: 'role.assignment.superseded',
				hubId: input.hubId,
				roleKey: existingHubAssignment.roleKey,
				targetUserId: input.targetUserId,
				metadata: {
					supersededBy: input.roleKey
				},
				session: input.session
			});
		}
	}

	return inheritedAssignments;
}

export async function revokeHubRoleAssignments(
	userIds: string[],
	hubId: string,
	revokedBy: string,
	options: RevokeHubRoleAssignmentsOptions = {}
) {
	await start_mongo();

	const normalizedHubId = String(hubId || '').trim();
	const normalizedUserIds = normalizeIds(userIds);
	const session = options.session ?? null;
	const roleKeys = options.roleKeys?.map(normalizeHubRoleKey).filter(Boolean);

	if (!normalizedHubId || normalizedUserIds.length === 0) {
		return [];
	}

	const query: Record<string, any> = {
		userId: { $in: normalizedUserIds },
		scopeType: 'hub',
		scopeId: normalizedHubId,
		isActive: true
	};

	if (roleKeys && roleKeys.length > 0) {
		query.roleKey = { $in: [...new Set(roleKeys)] };
	}

	const activeAssignments = await UserRoleAssignment.find(query)
		.session(session)
		.lean();

	if (activeAssignments.length === 0) {
		return [];
	}

	const hubOwnerAssignments = activeAssignments.filter(
		(assignment: any) => normalizeHubRoleKey(String(assignment.roleKey)) === 'HubOwner'
	);

	if (hubOwnerAssignments.length > 0) {
		const hubOwnerUserIds = normalizeIds(
			hubOwnerAssignments.map((assignment: any) => String(assignment.userId))
		);
		const remainingHubOwners = await UserRoleAssignment.countDocuments({
			roleKey: 'HubOwner',
			scopeType: 'hub',
			scopeId: normalizedHubId,
			isActive: true,
			userId: { $nin: hubOwnerUserIds }
		}).session(session);

		if (remainingHubOwners < 1) {
			throw new HubRoleRevocationError(
				'Every hub must keep at least one active HubOwner. Assign another HubOwner first.',
				409,
				'last_hub_owner'
			);
		}
	}

	const assignmentIds = activeAssignments
		.map((assignment: any) => assignment._id || assignment.id)
		.filter(Boolean);

	await UserRoleAssignment.updateMany(
		{ _id: { $in: assignmentIds }, scopeType: 'hub', scopeId: normalizedHubId },
		{ $set: { isActive: false, updatedAt: new Date() } },
		{ session: session ?? undefined }
	);

	if (options.audit !== false) {
		const auditUser = options.auditUser ?? revokedBy;
		for (const assignment of activeAssignments as any[]) {
			await createRbacAuditLog({
				user: auditUser,
				action: 'role.assignment.revoked',
				hubId: normalizedHubId,
				roleKey: assignment.roleKey,
				targetUserId: assignment.userId,
				metadata: {
					revokedBy
				},
				session
			});
		}
	}

	await Promise.all(
		(activeAssignments as any[]).map(async (assignment) => {
			const targetUserId = String(assignment.userId || '');
			if (!targetUserId) return;

			try {
				await emitEvent({
					type: 'role.revoked',
					actorId: revokedBy,
					recipients: [targetUserId],
					entityType: 'role',
					entityId: String(assignment._id || assignment.id || assignment.roleKey),
					metadata: {
						hubId: normalizedHubId,
						roleKey: assignment.roleKey,
						targetUserId,
						revokedBy,
						recipientRoles: {
							[targetUserId]: 'target'
						}
					}
				});
			} catch (eventError) {
				console.error('Failed to emit role revoked event:', eventError);
			}
		})
	);

	return activeAssignments;
}
