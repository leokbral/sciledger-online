import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import 'dotenv/config';

const PERMISSIONS = [
	'paper.submit',
	'paper.edit',
	'paper.sendToReview',
	'paper.assignReviewers',
	'paper.requestCorrections',
	'paper.accept',
	'paper.reject',
	'paper.publish',
	'paper.withdraw',
	'review.submit',
	'review.assign',
	'review.manageDeadlines',
	'hub.manageMembers',
	'hub.manageEditors',
	'hub.manageRoles',
	'rbac.manage'
];

const DEFAULT_GLOBAL_ROLES = [
	{
		key: 'Admin',
		name: 'Admin',
		description: 'Platform administrator with every editorial, support and RBAC permission.',
		priority: 0,
		inheritsFrom: [],
		permissions: PERMISSIONS,
		isSystem: true,
		isProtected: true
	},
	{
		key: 'Support',
		name: 'Support',
		description: 'Platform support role for hub recovery and operational assistance.',
		priority: 0,
		inheritsFrom: [],
		permissions: ['hub.manageRoles', 'hub.manageMembers', 'hub.manageEditors'],
		isSystem: true,
		isProtected: false
	},
	{
		key: 'Author',
		name: 'Author',
		description: 'Author role for submission and own-paper edits.',
		priority: 10,
		inheritsFrom: [],
		permissions: ['paper.submit', 'paper.edit', 'paper.withdraw'],
		isSystem: true,
		isProtected: true
	},
	{
		key: 'Reviewer',
		name: 'Reviewer',
		description: 'Global reviewer compatibility role. review.submit also requires an active assignment.',
		priority: 20,
		inheritsFrom: [],
		permissions: ['review.submit'],
		isSystem: true,
		isProtected: true
	}
];

const DEFAULT_HUB_ROLES = [
	{
		key: 'HubOwner',
		name: 'Hub Owner',
		description: 'Protected top administrator for a single hub.',
		priority: 100,
		inheritsFrom: ['EditorChief'],
		permissions: [
			'paper.sendToReview',
			'paper.assignReviewers',
			'paper.requestCorrections',
			'paper.accept',
			'paper.reject',
			'paper.publish',
			'review.assign',
			'review.manageDeadlines',
			'hub.manageMembers',
			'hub.manageEditors',
			'hub.manageRoles'
		],
		isSystem: true,
		isProtected: true
	},
	{
		key: 'EditorChief',
		name: 'Editor Chief',
		description: 'Editor-in-chief for a scoped hub.',
		priority: 90,
		inheritsFrom: ['AssociateEditor'],
		permissions: [
			'paper.sendToReview',
			'paper.assignReviewers',
			'paper.requestCorrections',
			'paper.accept',
			'paper.reject',
			'paper.publish',
			'review.assign',
			'review.manageDeadlines',
			'hub.manageMembers',
			'hub.manageEditors'
		],
		isSystem: true,
		isProtected: false
	},
	{
		key: 'AssociateEditor',
		name: 'Associate Editor',
		description: 'Default hub role for configurable editorial workflow actions.',
		priority: 70,
		inheritsFrom: ['Reviewer'],
		permissions: ['paper.sendToReview', 'paper.assignReviewers', 'paper.requestCorrections'],
		isSystem: true,
		isProtected: false
	},
	{
		key: 'Reviewer',
		name: 'Reviewer',
		description: 'Hub reviewer role. review.submit also requires an active assignment.',
		priority: 20,
		inheritsFrom: [],
		permissions: ['review.submit'],
		isSystem: true,
		isProtected: false
	}
];

function getMongoUri() {
	const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
	if (!uri) {
		throw new Error('Set MONGODB_URI or MONGO_URL.');
	}
	return uri;
}

function getDbName(uri) {
	if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
	const parsed = new URL(uri);
	return parsed.pathname?.replace(/^\//, '').split('/')[0] || 'sciledger';
}

function normalizeId(value) {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return '';
}

function roleDocument(role, scopeType, scopeId) {
	const now = new Date();
	return {
		_id: crypto.randomUUID(),
		id: crypto.randomUUID(),
		key: role.key,
		name: role.name,
		description: role.description,
		permissions: role.permissions,
		priority: role.priority,
		inheritsFrom: role.inheritsFrom,
		scopeType,
		scopeId,
		isSystem: role.isSystem,
		isProtected: role.isProtected,
		isActive: true,
		createdAt: now,
		updatedAt: now
	};
}

async function upsertRole(roles, role, scopeType, scopeId, dryRun) {
	const filter = { key: role.key, scopeType, scopeId };
	const existing = await roles.findOne(filter);
	if (existing) {
		const existingInheritance = JSON.stringify(existing.inheritsFrom || []);
		const expectedInheritance = JSON.stringify(role.inheritsFrom || []);
		if (existing.priority === role.priority && existingInheritance === expectedInheritance) return;

		console.log(`Update ${scopeType} role ${role.key} hierarchy${scopeId ? ` for hub ${scopeId}` : ''}`);
		if (!dryRun) {
			await roles.updateOne(filter, {
				$set: {
					priority: role.priority,
					inheritsFrom: role.inheritsFrom,
					updatedAt: new Date()
				}
			});
		}
		return;
	}

	console.log(`Create ${scopeType} role ${role.key}${scopeId ? ` for hub ${scopeId}` : ''}`);
	if (!dryRun) {
		await roles.insertOne(roleDocument(role, scopeType, scopeId));
	}
}

async function upsertAssignment(assignments, filter, grantedBy, dryRun) {
	const existing = await assignments.findOne(filter);
	if (existing) {
		if (existing.isActive === false) {
			console.log(`Reactivate ${filter.roleKey} for user ${filter.userId} (${filter.scopeType}:${filter.scopeId ?? 'global'})`);
			if (!dryRun) {
				await assignments.updateOne(filter, {
					$set: {
						grantedBy,
						isActive: true,
						updatedAt: new Date()
					}
				});
			}
		}
		return;
	}

	console.log(`Assign ${filter.roleKey} to user ${filter.userId} (${filter.scopeType}:${filter.scopeId ?? 'global'})`);
	if (!dryRun) {
		const now = new Date();
		await assignments.insertOne({
			_id: crypto.randomUUID(),
			id: crypto.randomUUID(),
			...filter,
			grantedBy,
			isActive: true,
			createdAt: now,
			updatedAt: now
		});
	}
}

const HUB_ROLE_ALIASES = {
	ManagingEditor: 'EditorChief',
	vice_manager: 'EditorChief',
	reviewer: 'Reviewer'
};

function normalizeHubRoleKey(roleKey) {
	return HUB_ROLE_ALIASES[roleKey] || roleKey;
}

function roleInheritsRole(roleKey, inheritedRoleKey, rolesByKey, visited = new Set()) {
	if (roleKey === inheritedRoleKey || visited.has(roleKey)) return false;
	visited.add(roleKey);

	const role = rolesByKey.get(roleKey);
	return (role?.inheritsFrom || []).some(
		(candidateRoleKey) =>
			candidateRoleKey === inheritedRoleKey ||
			roleInheritsRole(candidateRoleKey, inheritedRoleKey, rolesByKey, new Set(visited))
	);
}

async function deactivateSupersededHubAssignments(
	assignments,
	activeAssignments,
	hubId,
	roleKey,
	rolesByKey,
	dryRun
) {
	const supersededAssignments = activeAssignments.filter((assignment) => {
		const rawRoleKey = String(assignment.roleKey);
		const existingRoleKey = normalizeHubRoleKey(rawRoleKey);
		return (
			rawRoleKey !== roleKey &&
			(existingRoleKey === roleKey || roleInheritsRole(roleKey, existingRoleKey, rolesByKey))
		);
	});
	const supersededIds = supersededAssignments
		.map((assignment) => assignment._id || assignment.id)
		.filter(Boolean);

	if (supersededIds.length === 0) return;

	console.log(
		`Deactivate lower hub roles [${supersededAssignments
			.map((assignment) => assignment.roleKey)
			.join(', ')}] superseded by ${roleKey} for hub ${hubId}`
	);

	if (!dryRun) {
		await assignments.updateMany(
			{ _id: { $in: supersededIds }, scopeType: 'hub', scopeId: hubId },
			{ $set: { isActive: false, updatedAt: new Date() } }
		);
	}
}

async function assignHighestHubRole(assignments, userId, hubId, requestedRoleKey, grantedBy, dryRun) {
	const roleKey = normalizeHubRoleKey(requestedRoleKey);
	const rolesByKey = new Map(DEFAULT_HUB_ROLES.map((role) => [role.key, role]));
	const activeAssignments = await assignments
		.find({ userId, scopeType: 'hub', scopeId: hubId, isActive: true })
		.toArray();
	const coveringAssignment = activeAssignments.find((assignment) => {
		const existingRoleKey = normalizeHubRoleKey(String(assignment.roleKey));
		return existingRoleKey !== roleKey && roleInheritsRole(existingRoleKey, roleKey, rolesByKey);
	});

	if (coveringAssignment) {
		const coveringRoleKey = normalizeHubRoleKey(String(coveringAssignment.roleKey));
		if (String(coveringAssignment.roleKey) !== coveringRoleKey) {
			await upsertAssignment(
				assignments,
				{ userId, roleKey: coveringRoleKey, scopeType: 'hub', scopeId: hubId },
				grantedBy,
				dryRun
			);
		}
		await deactivateSupersededHubAssignments(
			assignments,
			activeAssignments,
			hubId,
			coveringRoleKey,
			rolesByKey,
			dryRun
		);
		console.log(`Skip ${roleKey} for user ${userId}; covered by ${coveringRoleKey} in hub ${hubId}`);
		return;
	}

	await upsertAssignment(
		assignments,
		{ userId, roleKey, scopeType: 'hub', scopeId: hubId },
		grantedBy,
		dryRun
	);

	await deactivateSupersededHubAssignments(
		assignments,
		activeAssignments,
		hubId,
		roleKey,
		rolesByKey,
		dryRun
	);
}

async function cleanupHubRoleAssignments(assignments, hubId, dryRun) {
	const rolesByKey = new Map(DEFAULT_HUB_ROLES.map((role) => [role.key, role]));
	const priorityByKey = new Map(DEFAULT_HUB_ROLES.map((role) => [role.key, role.priority]));
	const activeAssignments = await assignments
		.find({ scopeType: 'hub', scopeId: hubId, isActive: true })
		.toArray();
	const userIds = [...new Set(activeAssignments.map((assignment) => String(assignment.userId)))];

	for (const userId of userIds) {
		const officialAssignments = activeAssignments.filter((assignment) => {
			const roleKey = normalizeHubRoleKey(String(assignment.roleKey));
			return String(assignment.userId) === userId && rolesByKey.has(roleKey);
		});

		if (officialAssignments.length <= 1) continue;

		const highestAssignment = [...officialAssignments].sort((left, right) => {
			const leftPriority = priorityByKey.get(normalizeHubRoleKey(String(left.roleKey))) ?? 0;
			const rightPriority = priorityByKey.get(normalizeHubRoleKey(String(right.roleKey))) ?? 0;
			return rightPriority - leftPriority;
		})[0];

		await assignHighestHubRole(
			assignments,
			userId,
			hubId,
			normalizeHubRoleKey(String(highestAssignment.roleKey)),
			highestAssignment.grantedBy || 'system-migration-cleanup',
			dryRun
		);
	}
}

async function dropLegacyRoleKeyIndex(roles, dryRun) {
	const indexes = await roles.indexes();
	const legacy = indexes.find((index) => index.name === 'key_1' && index.unique);
	if (!legacy?.name) return;

	console.log('Drop legacy unique roles.key index');
	if (!dryRun) {
		await roles.dropIndex(legacy.name);
	}
}

async function run() {
	const dryRun = process.argv.includes('--dry-run');
	const uri = getMongoUri();
	const dbName = getDbName(uri);
	const client = new MongoClient(uri);

	console.log(`RBAC scoped migration (${dryRun ? 'dry-run' : 'write'}) on database "${dbName}"`);

	try {
		await client.connect();
		const db = client.db(dbName);
		const roles = db.collection('roles');
		const assignments = db.collection('userRoleAssignments');
		const hubs = db.collection('hubs');
		const users = db.collection('users');

		await dropLegacyRoleKeyIndex(roles, dryRun);

		if (!dryRun) {
			await roles.updateMany(
				{ scopeType: { $exists: false } },
				{ $set: { scopeType: 'global', scopeId: null } }
			);
			await roles.updateMany(
				{ scopeType: 'global', scopeId: { $exists: false } },
				{ $set: { scopeId: null } }
			);
			await roles.updateMany(
				{
					scopeType: 'global',
					scopeId: null,
					key: { $in: ['HubOwner', 'EditorChief', 'ManagingEditor', 'AssociateEditor'] }
				},
				{ $set: { isActive: false, updatedAt: new Date() } }
			);
		}

		for (const role of DEFAULT_GLOBAL_ROLES) {
			await upsertRole(roles, role, 'global', null, dryRun);
		}

		const legacyAdmins = await users
			.find({ $or: [{ isAdmin: true }, { 'roles.admin': true }] })
			.project({ id: 1, _id: 1 })
			.toArray();

		for (const admin of legacyAdmins) {
			const userId = String(admin.id || admin._id);
			await upsertAssignment(
				assignments,
				{ userId, roleKey: 'Admin', scopeType: 'global', scopeId: null },
				'system-migration',
				dryRun
			);
		}

		const legacyAuthors = await users
			.find({ 'roles.author': true })
			.project({ id: 1, _id: 1 })
			.toArray();

		for (const author of legacyAuthors) {
			const userId = String(author.id || author._id);
			await upsertAssignment(
				assignments,
				{ userId, roleKey: 'Author', scopeType: 'global', scopeId: null },
				'system-migration',
				dryRun
			);
		}

		const legacyReviewers = await users
			.find({ 'roles.reviewer': true })
			.project({ id: 1, _id: 1 })
			.toArray();

		for (const reviewer of legacyReviewers) {
			const userId = String(reviewer.id || reviewer._id);
			await upsertAssignment(
				assignments,
				{ userId, roleKey: 'Reviewer', scopeType: 'global', scopeId: null },
				'system-migration',
				dryRun
			);
		}

		const hubDocs = await hubs.find({}).toArray();
		for (const hub of hubDocs) {
			const hubId = normalizeId(hub);
			if (!hubId) {
				console.warn(`Skip hub without id: ${JSON.stringify(hub)}`);
				continue;
			}

			for (const role of DEFAULT_HUB_ROLES) {
				await upsertRole(roles, role, 'hub', hubId, dryRun);
			}

			const legacyManagingRole = await roles.findOne({
				key: 'ManagingEditor',
				scopeType: 'hub',
				scopeId: hubId,
				isActive: true
			});
			if (legacyManagingRole) {
				console.log(`Deactivate legacy hub role ManagingEditor for hub ${hubId}`);
				if (!dryRun) {
					await roles.updateOne(
						{ key: 'ManagingEditor', scopeType: 'hub', scopeId: hubId },
						{ $set: { isActive: false, updatedAt: new Date() } }
					);
				}
			}

			const activeOwner = await assignments.findOne({
				roleKey: 'HubOwner',
				scopeType: 'hub',
				scopeId: hubId,
				isActive: true
			});

			if (!activeOwner) {
				const ownerId = normalizeId(hub.createdBy);
				if (!ownerId) {
					throw new Error(`Hub ${hubId} has no active HubOwner and no createdBy fallback.`);
				}

				await assignHighestHubRole(
					assignments,
					ownerId,
					hubId,
					'HubOwner',
					'system-migration',
					dryRun
				);
			}

			const legacyManagingAssignments = await assignments
				.find({
					roleKey: 'ManagingEditor',
					scopeType: 'hub',
					scopeId: hubId,
					isActive: true
				})
				.toArray();

			for (const assignment of legacyManagingAssignments) {
				await assignHighestHubRole(
					assignments,
					String(assignment.userId),
					hubId,
					'EditorChief',
					assignment.grantedBy || 'system-migration',
					dryRun
				);
			}

			for (const manager of hub.assistantManagers || []) {
				const userId = normalizeId(manager);
				if (!userId) continue;
				await assignHighestHubRole(
					assignments,
					userId,
					hubId,
					'EditorChief',
					'system-migration',
					dryRun
				);
			}

			for (const reviewer of hub.reviewers || []) {
				const userId = normalizeId(reviewer);
				if (!userId) continue;
				await assignHighestHubRole(
					assignments,
					userId,
					hubId,
					'Reviewer',
					'system-migration',
					dryRun
				);
			}

			await cleanupHubRoleAssignments(assignments, hubId, dryRun);
		}

		if (!dryRun) {
			await roles.createIndex({ scopeType: 1, scopeId: 1, key: 1 }, { unique: true });
			await roles.createIndex({ isActive: 1 });
			await assignments.createIndex(
				{ userId: 1, roleKey: 1, scopeType: 1, scopeId: 1 },
				{ unique: true }
			);
			await assignments.createIndex({ roleKey: 1, scopeType: 1, scopeId: 1, isActive: 1 });
		}

		console.log('RBAC scoped migration finished.');
	} finally {
		await client.close();
	}
}

run().catch((error) => {
	console.error('RBAC migration failed:', error);
	process.exitCode = 1;
});
