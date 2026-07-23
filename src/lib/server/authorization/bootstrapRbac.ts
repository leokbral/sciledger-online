import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import { DEFAULT_GLOBAL_ROLES, DEFAULT_HUB_ROLES } from './permissions';

type LegacyHubLike = {
	assistantManagers?: unknown[] | null;
	reviewers?: unknown[] | null;
};

type HubRoleAssignmentRow = {
	roleKey?: unknown;
	isActive?: boolean | null;
};

let bootstrapPromise: Promise<void> | null = null;
const hubBootstrapPromises = new Map<string, Promise<void>>();

function normalizeEntityId(input: any): string | undefined {
	if (!input) return undefined;
	if (typeof input === 'string') return input;
	if (typeof input === 'number') return String(input);
	if (typeof input === 'object') {
		if (input.id) return String(input.id);
		if (input._id) return String(input._id);
	}
	return undefined;
}

function normalizeEntityIds(input: unknown[] | null | undefined) {
	return [
		...new Set((Array.isArray(input) ? input : []).map(normalizeEntityId).filter(Boolean))
	] as string[];
}

function normalizeHubRoleKey(roleKey: string) {
	if (roleKey === 'ManagingEditor' || roleKey === 'vice_manager') return 'EditorChief';
	if (roleKey === 'reviewer') return 'Reviewer';
	return roleKey;
}

function roleInheritsRole(
	roleKey: string,
	inheritedRoleKey: string,
	visited = new Set<string>()
): boolean {
	if (roleKey === inheritedRoleKey || visited.has(roleKey)) return false;
	visited.add(roleKey);

	const role = DEFAULT_HUB_ROLES.find((candidate) => candidate.key === roleKey);
	return (role?.inheritsFrom || []).some(
		(candidateRoleKey) =>
			candidateRoleKey === inheritedRoleKey ||
			roleInheritsRole(candidateRoleKey, inheritedRoleKey, new Set(visited))
	);
}

function roleCoversRole(roleKey: string, requestedRoleKey: string) {
	const normalizedRoleKey = normalizeHubRoleKey(roleKey);
	const normalizedRequestedRoleKey = normalizeHubRoleKey(requestedRoleKey);
	return (
		normalizedRoleKey === normalizedRequestedRoleKey ||
		roleInheritsRole(normalizedRoleKey, normalizedRequestedRoleKey)
	);
}

async function dropLegacyRoleKeyIndex() {
	try {
		const indexes = await Role.collection.indexes();
		const legacyKeyIndex = indexes.find((index) => index.name === 'key_1' && index.unique);
		if (legacyKeyIndex?.name) {
			await Role.collection.dropIndex(legacyKeyIndex.name);
		}
	} catch (error) {
		console.warn('Unable to drop legacy Role.key index:', error);
	}
}

export async function ensureDefaultRoles() {
	if (bootstrapPromise) {
		return bootstrapPromise;
	}

	bootstrapPromise = (async () => {
		await dropLegacyRoleKeyIndex();

		await Role.updateMany(
			{ scopeType: { $exists: false } },
			{ $set: { scopeType: 'global', scopeId: null } }
		);

		await Role.updateMany(
			{ scopeType: 'global', scopeId: { $exists: false } },
			{ $set: { scopeId: null } }
		);

		const hubOnlyRoleKeys = [
			...DEFAULT_HUB_ROLES.map((role) => role.key).filter((roleKey) => roleKey !== 'Reviewer'),
			'ManagingEditor'
		];
		await Role.updateMany(
			{ scopeType: 'global', scopeId: null, key: { $in: hubOnlyRoleKeys } },
			{ $set: { isActive: false, updatedAt: new Date() } }
		);

		await Promise.all(
			DEFAULT_GLOBAL_ROLES.map((role) =>
				Role.updateOne(
					{ key: role.key, scopeType: 'global', scopeId: null },
					{
						$set: {
							priority: role.priority,
							inheritsFrom: role.inheritsFrom
						},
						$setOnInsert: {
							key: role.key,
							name: role.name,
							description: role.description,
							permissions: role.permissions,
							scopeType: 'global',
							scopeId: null,
							isSystem: role.isSystem,
							isProtected: role.isProtected,
							isActive: true
						}
					},
					{ upsert: true }
				)
			)
		);
	})().catch((error) => {
		bootstrapPromise = null;
		throw error;
	});

	return bootstrapPromise;
}

export async function ensureHubRoles(hubId: string) {
	const normalizedHubId = String(hubId || '').trim();
	if (!normalizedHubId) return;

	await ensureDefaultRoles();

	const existingPromise = hubBootstrapPromises.get(normalizedHubId);
	if (existingPromise) {
		return existingPromise;
	}

	const promise = Promise.all(
		DEFAULT_HUB_ROLES.map((role) =>
			Role.updateOne(
				{ key: role.key, scopeType: 'hub', scopeId: normalizedHubId },
				{
					$set: {
						priority: role.priority,
						inheritsFrom: role.inheritsFrom
					},
					$setOnInsert: {
						key: role.key,
						name: role.name,
						description: role.description,
						permissions: role.permissions,
						scopeType: 'hub',
						scopeId: normalizedHubId,
						isSystem: role.isSystem,
						isProtected: role.isProtected,
						isActive: true
					}
				},
				{ upsert: true }
			)
		)
	)
		.then(() => undefined)
		.catch((error) => {
			hubBootstrapPromises.delete(normalizedHubId);
			throw error;
		});

	hubBootstrapPromises.set(normalizedHubId, promise);
	return promise;
}

export async function ensureHubOwnerAssignment(hub: any) {
	const hubId = normalizeEntityId(hub);
	const ownerId = normalizeEntityId(hub?.createdBy);
	if (!hubId || !ownerId) return;

	await ensureHubRoles(hubId);

	const existingOwner = await UserRoleAssignment.exists({
		roleKey: 'HubOwner',
		scopeType: 'hub',
		scopeId: hubId,
		isActive: true
	});

	if (!existingOwner) {
		await UserRoleAssignment.updateOne(
			{
				userId: ownerId,
				roleKey: 'HubOwner',
				scopeType: 'hub',
				scopeId: hubId
			},
			{
				$set: {
					isActive: true,
					updatedAt: new Date()
				},
				$setOnInsert: {
					userId: ownerId,
					roleKey: 'HubOwner',
					scopeType: 'hub',
					scopeId: hubId,
					grantedBy: 'system-bootstrap',
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	const ownerHasHubOwner = !existingOwner
		? true
		: await UserRoleAssignment.exists({
				userId: ownerId,
				roleKey: 'HubOwner',
				scopeType: 'hub',
				scopeId: hubId,
				isActive: true
			});

	if (!ownerHasHubOwner) return;

	await UserRoleAssignment.updateMany(
		{
			userId: ownerId,
			roleKey: { $in: ['EditorChief', 'ManagingEditor', 'AssociateEditor', 'Reviewer'] },
			scopeType: 'hub',
			scopeId: hubId,
			isActive: true
		},
		{ $set: { isActive: false, updatedAt: new Date() } }
	);
}

async function seedMissingLegacyHubAssignment(
	userId: string,
	hubId: string,
	roleKey: 'EditorChief' | 'Reviewer',
	grantedBy: string
) {
	const normalizedUserId = String(userId || '').trim();
	const normalizedHubId = String(hubId || '').trim();
	const normalizedRoleKey = normalizeHubRoleKey(roleKey);

	if (!normalizedUserId || !normalizedHubId || !normalizedRoleKey) return;

	const existingAssignments = (await UserRoleAssignment.find({
		userId: normalizedUserId,
		scopeType: 'hub',
		scopeId: normalizedHubId
	})
		.select('roleKey isActive')
		.lean()) as HubRoleAssignmentRow[];

	const activeAssignments = existingAssignments.filter(
		(assignment) => assignment.isActive !== false
	);
	const alreadyCovered = activeAssignments.some((assignment) =>
		roleCoversRole(String(assignment.roleKey), normalizedRoleKey)
	);
	if (alreadyCovered) return;

	const inactiveSameRole = existingAssignments.some(
		(assignment) =>
			assignment.isActive === false &&
			normalizeHubRoleKey(String(assignment.roleKey)) === normalizedRoleKey
	);
	if (inactiveSameRole) return;

	await UserRoleAssignment.updateOne(
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
		{ upsert: true }
	);

	const supersededRoleKeys = activeAssignments
		.map((assignment) => normalizeHubRoleKey(String(assignment.roleKey)))
		.filter(
			(activeRoleKey) =>
				activeRoleKey !== normalizedRoleKey && roleCoversRole(normalizedRoleKey, activeRoleKey)
		);

	if (supersededRoleKeys.length === 0) return;

	await UserRoleAssignment.updateMany(
		{
			userId: normalizedUserId,
			roleKey: { $in: supersededRoleKeys },
			scopeType: 'hub',
			scopeId: normalizedHubId,
			isActive: true
		},
		{ $set: { isActive: false, updatedAt: new Date() } }
	);
}

export async function ensureHubLegacyRoleAssignments(hub: unknown) {
	const hubId = normalizeEntityId(hub);
	if (!hubId) return;

	await ensureHubOwnerAssignment(hub);

	const legacyHub = (hub && typeof hub === 'object' ? hub : {}) as LegacyHubLike;
	const managerIds = normalizeEntityIds(legacyHub.assistantManagers);
	const reviewerIds = normalizeEntityIds(legacyHub.reviewers);

	await Promise.all([
		...managerIds.map((userId) =>
			seedMissingLegacyHubAssignment(userId, hubId, 'EditorChief', 'system-legacy-hub-sync')
		),
		...reviewerIds.map((userId) =>
			seedMissingLegacyHubAssignment(userId, hubId, 'Reviewer', 'system-legacy-hub-sync')
		)
	]);
}
