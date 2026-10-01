/**
 * Bootstraps the first platform super administrator.
 *
 * Design constraints, all enforced below:
 *   - Runs only from a shell. There is deliberately no HTTP endpoint that grants
 *     `platform.superAdmin`, so nobody can promote themselves over the network.
 *   - Never creates a user. If the configured address has no account, it reports
 *     that and exits non-zero.
 *   - Purely additive. It inserts one `userRoleAssignments` row and never touches
 *     the user document: not the password, not the e-mail, not the profile, and it
 *     removes no existing role.
 *   - Idempotent. Running it again converges on the same state and reports
 *     "already holds" instead of writing.
 *   - Touches exactly one user. Any other account that already holds the role is
 *     reported and left alone.
 *
 * Usage:
 *   SCILEDGER_SUPER_ADMIN_EMAIL=you@example.com node scripts/bootstrap-super-admin.js --dry-run
 *   SCILEDGER_SUPER_ADMIN_EMAIL=you@example.com node scripts/bootstrap-super-admin.js
 *   node scripts/bootstrap-super-admin.js --email=you@example.com
 */

import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import 'dotenv/config';

const SUPER_ADMIN_PERMISSION = 'platform.superAdmin';
const SUPER_ADMIN_ROLE_KEY = 'SuperAdmin';
const GRANTED_BY = 'system-bootstrap-super-admin';

const SUPER_ADMIN_ROLE = {
	key: SUPER_ADMIN_ROLE_KEY,
	name: 'Super Administrator',
	description:
		'Platform-wide administration: read access to every user, hub, paper, review and invitation. Granted only by the bootstrap script, never through the RBAC UI.',
	priority: 0,
	inheritsFrom: [],
	permissions: [SUPER_ADMIN_PERMISSION],
	isSystem: true,
	isProtected: true
};

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

function normalizeEmail(email) {
	return String(email || '')
		.trim()
		.toLowerCase();
}

function getConfiguredEmail() {
	const flag = process.argv.find((argument) => argument.startsWith('--email='));
	const raw = flag ? flag.slice('--email='.length) : process.env.SCILEDGER_SUPER_ADMIN_EMAIL;
	const email = normalizeEmail(raw);

	if (!email) {
		throw new Error(
			'No super administrator e-mail configured. Set SCILEDGER_SUPER_ADMIN_EMAIL in .env or pass --email=<address>.'
		);
	}

	return email;
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeId(value) {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return String(value);
}

/**
 * Looks the account up without ever creating one. Tries the normalized address
 * first, then falls back to a case-insensitive exact match so that accounts
 * stored before e-mail normalization are still found.
 */
async function findUserByEmail(users, email) {
	const exact = await users.findOne({ email });
	if (exact) return { user: exact, matchedCaseInsensitively: false };

	const insensitive = await users.findOne({
		email: { $regex: `^${escapeRegExp(email)}$`, $options: 'i' }
	});

	return insensitive
		? { user: insensitive, matchedCaseInsensitively: true }
		: { user: null, matchedCaseInsensitively: false };
}

async function ensureSuperAdminRole(roles, dryRun) {
	const filter = { key: SUPER_ADMIN_ROLE_KEY, scopeType: 'global', scopeId: null };
	const existing = await roles.findOne(filter);

	if (existing) {
		const permissions = Array.isArray(existing.permissions) ? existing.permissions : [];

		if (!permissions.includes(SUPER_ADMIN_PERMISSION)) {
			console.log(
				`Role ${SUPER_ADMIN_ROLE_KEY} exists but is missing ${SUPER_ADMIN_PERMISSION}; restoring the permission.`
			);
			if (!dryRun) {
				await roles.updateOne(filter, {
					$addToSet: { permissions: SUPER_ADMIN_PERMISSION },
					$set: { updatedAt: new Date() }
				});
			}
		}

		if (existing.isActive === false) {
			console.log(`Role ${SUPER_ADMIN_ROLE_KEY} is inactive; reactivating.`);
			if (!dryRun) {
				await roles.updateOne(filter, { $set: { isActive: true, updatedAt: new Date() } });
			}
		}

		if (permissions.includes(SUPER_ADMIN_PERMISSION) && existing.isActive !== false) {
			console.log(`Role ${SUPER_ADMIN_ROLE_KEY} already present and correct.`);
		}

		return;
	}

	console.log(`Create global role ${SUPER_ADMIN_ROLE_KEY} carrying ${SUPER_ADMIN_PERMISSION}.`);
	if (dryRun) return;

	const now = new Date();
	await roles.insertOne({
		_id: crypto.randomUUID(),
		id: crypto.randomUUID(),
		...SUPER_ADMIN_ROLE,
		scopeType: 'global',
		scopeId: null,
		isActive: true,
		createdAt: now,
		updatedAt: now
	});
}

/**
 * Grants the role additively. Existing assignments of any other role are not read,
 * not rewritten and not deactivated.
 */
async function grantSuperAdmin(assignments, userId, dryRun) {
	const filter = {
		userId,
		roleKey: SUPER_ADMIN_ROLE_KEY,
		scopeType: 'global',
		scopeId: null
	};

	const existing = await assignments.findOne(filter);

	if (existing && existing.isActive !== false) {
		console.log(`User ${userId} already holds ${SUPER_ADMIN_ROLE_KEY}; nothing to write.`);
		return 'unchanged';
	}

	if (existing) {
		console.log(`Reactivating ${SUPER_ADMIN_ROLE_KEY} for user ${userId}.`);
		if (!dryRun) {
			await assignments.updateOne(filter, {
				$set: { isActive: true, grantedBy: GRANTED_BY, updatedAt: new Date() }
			});
		}
		return 'reactivated';
	}

	console.log(`Assigning ${SUPER_ADMIN_ROLE_KEY} to user ${userId} at global scope.`);
	if (!dryRun) {
		const now = new Date();
		await assignments.insertOne({
			_id: crypto.randomUUID(),
			id: crypto.randomUUID(),
			...filter,
			grantedBy: GRANTED_BY,
			isActive: true,
			createdAt: now,
			updatedAt: now
		});
	}

	return 'granted';
}

async function recordBootstrapAudit(activityEvents, userId, outcome, dryRun) {
	if (dryRun || outcome === 'unchanged') return;

	await activityEvents.insertOne({
		type: 'admin.super_admin.bootstrapped',
		actorId: null,
		targetUserId: userId,
		entityType: 'user',
		entityId: userId,
		metadata: {
			roleKey: SUPER_ADMIN_ROLE_KEY,
			permission: SUPER_ADMIN_PERMISSION,
			scopeType: 'global',
			outcome,
			grantedBy: GRANTED_BY,
			result: 'allowed'
		},
		createdAt: new Date()
	});
}

async function reportOtherHolders(assignments, users, grantedUserId) {
	const holders = await assignments
		.find({
			roleKey: SUPER_ADMIN_ROLE_KEY,
			scopeType: 'global',
			isActive: true,
			userId: { $ne: grantedUserId }
		})
		.toArray();

	if (holders.length === 0) {
		console.log(`${SUPER_ADMIN_ROLE_KEY} is held by exactly one account, as intended.`);
		return;
	}

	console.warn(
		`WARNING: ${holders.length} other account(s) already hold ${SUPER_ADMIN_ROLE_KEY}. This script did not modify them:`
	);

	for (const holder of holders) {
		const holderUser = await users.findOne(
			{ $or: [{ id: holder.userId }, { _id: holder.userId }] },
			{ projection: { email: 1, username: 1, id: 1, _id: 1 } }
		);
		console.warn(`  - ${holder.userId}${holderUser?.email ? ` <${holderUser.email}>` : ''}`);
	}
}

async function run() {
	const dryRun = process.argv.includes('--dry-run');
	const email = getConfiguredEmail();
	const uri = getMongoUri();
	const dbName = getDbName(uri);
	const client = new MongoClient(uri);

	console.log(
		`Super administrator bootstrap (${dryRun ? 'dry-run' : 'write'}) on database "${dbName}" for <${email}>`
	);

	try {
		await client.connect();
		const db = client.db(dbName);
		const users = db.collection('users');
		const roles = db.collection('roles');
		const assignments = db.collection('userRoleAssignments');
		const activityEvents = db.collection('activityEvents');

		const { user, matchedCaseInsensitively } = await findUserByEmail(users, email);

		if (!user) {
			console.error(
				`\nUsuário ${email} não encontrado.\n` +
					'É necessário criar a conta normalmente através do fluxo de registro/login antes de executar o bootstrap do Super User.'
			);
			process.exitCode = 1;
			return;
		}

		const userId = normalizeId(user.id || user._id);
		if (!userId) {
			throw new Error(`Account <${email}> was found but has no usable identifier.`);
		}

		if (matchedCaseInsensitively) {
			console.warn(
				`NOTE: matched <${user.email}> case-insensitively. The stored address differs in case from the configured one.`
			);
		}

		console.log(
			`Found account ${userId} (${user.username ? `@${user.username}` : 'no username'}).`
		);

		await ensureSuperAdminRole(roles, dryRun);
		const outcome = await grantSuperAdmin(assignments, userId, dryRun);
		await recordBootstrapAudit(activityEvents, userId, outcome, dryRun);
		await reportOtherHolders(assignments, users, userId);

		if (dryRun) {
			console.log('\nDry run complete. No documents were written.');
			return;
		}

		const verification = await assignments.findOne({
			userId,
			roleKey: SUPER_ADMIN_ROLE_KEY,
			scopeType: 'global',
			scopeId: null,
			isActive: true
		});

		if (!verification) {
			throw new Error('Verification failed: the assignment is not readable after writing.');
		}

		console.log(
			`\nDone. <${email}> (${userId}) holds ${SUPER_ADMIN_ROLE_KEY} at global scope. Sign out and sign back in, then open /admin.`
		);
	} finally {
		await client.close();
	}
}

/**
 * Only self-execute when invoked as a CLI (`node scripts/bootstrap-super-admin.js`).
 * Importing this file -- which the unit tests do -- must not connect to a database
 * or write anything.
 */
const invokedDirectly =
	!!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
	run().catch((error) => {
		console.error('Super administrator bootstrap failed:', error);
		process.exitCode = 1;
	});
}

export {
	SUPER_ADMIN_PERMISSION,
	SUPER_ADMIN_ROLE_KEY,
	GRANTED_BY,
	normalizeEmail,
	getConfiguredEmail,
	escapeRegExp,
	normalizeId,
	findUserByEmail,
	ensureSuperAdminRole,
	grantSuperAdmin,
	reportOtherHolders,
	run
};
