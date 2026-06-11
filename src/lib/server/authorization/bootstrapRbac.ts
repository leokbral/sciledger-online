import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import { DEFAULT_GLOBAL_ROLES, DEFAULT_HUB_ROLES } from './permissions';

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
