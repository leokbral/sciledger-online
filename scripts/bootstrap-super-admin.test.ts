import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	SUPER_ADMIN_PERMISSION,
	SUPER_ADMIN_ROLE_KEY,
	ensureSuperAdminRole,
	findUserByEmail,
	getConfiguredEmail,
	grantSuperAdmin,
	normalizeEmail
} from './bootstrap-super-admin.js';

/**
 * In-memory stand-in for a MongoDB collection, matching the subset of the driver
 * the bootstrap script uses. Every write is recorded so the tests can assert that
 * a dry run writes nothing and that a second run writes nothing either.
 */
function createCollection(docs: any[] = []) {
	const writes: Array<{ op: string; args: any[] }> = [];

	function matches(doc: any, filter: any): boolean {
		return Object.entries(filter ?? {}).every(([key, condition]) => {
			if (condition && typeof condition === 'object' && '$regex' in (condition as any)) {
				const { $regex, $options } = condition as any;
				return new RegExp($regex, $options ?? '').test(String(doc[key] ?? ''));
			}
			if (condition && typeof condition === 'object' && '$ne' in (condition as any)) {
				return doc[key] !== (condition as any).$ne;
			}
			return doc[key] === condition;
		});
	}

	return {
		docs,
		writes,
		async findOne(filter: any) {
			return docs.find((doc) => matches(doc, filter)) ?? null;
		},
		find(filter: any) {
			return { toArray: async () => docs.filter((doc) => matches(doc, filter)) };
		},
		async insertOne(doc: any) {
			writes.push({ op: 'insertOne', args: [doc] });
			docs.push(doc);
			return { insertedId: doc._id };
		},
		async updateOne(filter: any, update: any) {
			writes.push({ op: 'updateOne', args: [filter, update] });
			const target = docs.find((doc) => matches(doc, filter));
			if (!target) return { matchedCount: 0, modifiedCount: 0 };

			Object.assign(target, update.$set ?? {});
			for (const [key, value] of Object.entries(update.$addToSet ?? {})) {
				target[key] = [...new Set([...(target[key] ?? []), value])];
			}
			return { matchedCount: 1, modifiedCount: 1 };
		}
	};
}

const EXISTING_USER = {
	_id: 'user-uuid-1',
	id: 'user-uuid-1',
	email: 'cabralleonardoferreira@gmail.com',
	username: 'leo',
	password: '$2b$10$untouched',
	firstName: 'Leonardo',
	lastName: 'Cabral'
};

let logSpy: any;
let warnSpy: any;

beforeEach(() => {
	logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	logSpy.mockRestore();
	warnSpy.mockRestore();
	vi.unstubAllEnvs();
});

describe('configured e-mail', () => {
	it('normalizes case and surrounding whitespace', () => {
		expect(normalizeEmail('  CabralLeonardoFerreira@Gmail.com  ')).toBe(
			'cabralleonardoferreira@gmail.com'
		);
	});

	it('reads SCILEDGER_SUPER_ADMIN_EMAIL from the environment', () => {
		vi.stubEnv('SCILEDGER_SUPER_ADMIN_EMAIL', 'cabralleonardoferreira@gmail.com');
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'script.js']);

		expect(getConfiguredEmail()).toBe('cabralleonardoferreira@gmail.com');
	});

	it('lets --email override the environment', () => {
		vi.stubEnv('SCILEDGER_SUPER_ADMIN_EMAIL', 'from-env@example.com');
		vi.spyOn(process, 'argv', 'get').mockReturnValue([
			'node',
			'script.js',
			'--email=Override@Example.com'
		]);

		expect(getConfiguredEmail()).toBe('override@example.com');
	});

	it('refuses to run with no address configured', () => {
		vi.stubEnv('SCILEDGER_SUPER_ADMIN_EMAIL', '');
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'script.js']);

		expect(() => getConfiguredEmail()).toThrow(/No super administrator e-mail configured/);
	});
});

describe('locating the account', () => {
	it('finds the existing account by its normalized address', async () => {
		const users = createCollection([{ ...EXISTING_USER }]);

		const result = await findUserByEmail(users, 'cabralleonardoferreira@gmail.com');

		expect(result.user?.id).toBe('user-uuid-1');
		expect(result.matchedCaseInsensitively).toBe(false);
	});

	it('still finds an account stored with different casing', async () => {
		const users = createCollection([
			{ ...EXISTING_USER, email: 'CabralLeonardoFerreira@Gmail.com' }
		]);

		const result = await findUserByEmail(users, 'cabralleonardoferreira@gmail.com');

		expect(result.user?.id).toBe('user-uuid-1');
		expect(result.matchedCaseInsensitively).toBe(true);
	});

	it('returns null and writes nothing when the account does not exist', async () => {
		const users = createCollection([]);

		const result = await findUserByEmail(users, 'cabralleonardoferreira@gmail.com');

		expect(result.user).toBeNull();
		expect(users.writes).toHaveLength(0);
		expect(users.docs).toHaveLength(0);
	});

	it('treats a regex-shaped address as a literal, not a pattern', async () => {
		const users = createCollection([{ ...EXISTING_USER }]);

		const result = await findUserByEmail(users, '.*@gmail.com');

		expect(result.user).toBeNull();
	});
});

describe('the SuperAdmin role document', () => {
	it('is created with exactly the platform.superAdmin permission', async () => {
		const roles = createCollection([]);

		await ensureSuperAdminRole(roles, false);

		expect(roles.docs).toHaveLength(1);
		expect(roles.docs[0]).toMatchObject({
			key: SUPER_ADMIN_ROLE_KEY,
			scopeType: 'global',
			scopeId: null,
			permissions: [SUPER_ADMIN_PERMISSION],
			isSystem: true,
			isProtected: true,
			isActive: true
		});
	});

	it('writes nothing on a dry run', async () => {
		const roles = createCollection([]);

		await ensureSuperAdminRole(roles, true);

		expect(roles.writes).toHaveLength(0);
		expect(roles.docs).toHaveLength(0);
	});

	it('leaves an already correct role untouched', async () => {
		const roles = createCollection([
			{
				key: SUPER_ADMIN_ROLE_KEY,
				scopeType: 'global',
				scopeId: null,
				permissions: [SUPER_ADMIN_PERMISSION],
				isActive: true
			}
		]);

		await ensureSuperAdminRole(roles, false);

		expect(roles.writes).toHaveLength(0);
	});

	it('restores the permission if something stripped it', async () => {
		const roles = createCollection([
			{
				key: SUPER_ADMIN_ROLE_KEY,
				scopeType: 'global',
				scopeId: null,
				permissions: [],
				isActive: true
			}
		]);

		await ensureSuperAdminRole(roles, false);

		expect(roles.docs[0].permissions).toContain(SUPER_ADMIN_PERMISSION);
	});

	it('reactivates a deactivated role', async () => {
		const roles = createCollection([
			{
				key: SUPER_ADMIN_ROLE_KEY,
				scopeType: 'global',
				scopeId: null,
				permissions: [SUPER_ADMIN_PERMISSION],
				isActive: false
			}
		]);

		await ensureSuperAdminRole(roles, false);

		expect(roles.docs[0].isActive).toBe(true);
	});
});

describe('granting the role', () => {
	it('inserts one global assignment for the target account', async () => {
		const assignments = createCollection([]);

		const outcome = await grantSuperAdmin(assignments, 'user-uuid-1', false);

		expect(outcome).toBe('granted');
		expect(assignments.docs).toHaveLength(1);
		expect(assignments.docs[0]).toMatchObject({
			userId: 'user-uuid-1',
			roleKey: SUPER_ADMIN_ROLE_KEY,
			scopeType: 'global',
			scopeId: null,
			isActive: true
		});
	});

	it('is idempotent: a second run writes nothing', async () => {
		const assignments = createCollection([]);

		await grantSuperAdmin(assignments, 'user-uuid-1', false);
		const writesAfterFirst = assignments.writes.length;

		const outcome = await grantSuperAdmin(assignments, 'user-uuid-1', false);

		expect(outcome).toBe('unchanged');
		expect(assignments.writes).toHaveLength(writesAfterFirst);
		expect(assignments.docs).toHaveLength(1);
	});

	it('reactivates instead of duplicating a previously revoked assignment', async () => {
		const assignments = createCollection([
			{
				userId: 'user-uuid-1',
				roleKey: SUPER_ADMIN_ROLE_KEY,
				scopeType: 'global',
				scopeId: null,
				isActive: false
			}
		]);

		const outcome = await grantSuperAdmin(assignments, 'user-uuid-1', false);

		expect(outcome).toBe('reactivated');
		expect(assignments.docs).toHaveLength(1);
		expect(assignments.docs[0].isActive).toBe(true);
	});

	it('writes nothing on a dry run', async () => {
		const assignments = createCollection([]);

		const outcome = await grantSuperAdmin(assignments, 'user-uuid-1', true);

		expect(outcome).toBe('granted');
		expect(assignments.writes).toHaveLength(0);
		expect(assignments.docs).toHaveLength(0);
	});

	it('removes no existing role: other assignments stay active and unchanged', async () => {
		const existing = [
			{
				userId: 'user-uuid-1',
				roleKey: 'Author',
				scopeType: 'global',
				scopeId: null,
				isActive: true
			},
			{
				userId: 'user-uuid-1',
				roleKey: 'HubOwner',
				scopeType: 'hub',
				scopeId: 'hub-1',
				isActive: true
			},
			{
				userId: 'user-uuid-1',
				roleKey: 'Reviewer',
				scopeType: 'hub',
				scopeId: 'hub-1',
				isActive: true
			}
		];
		const assignments = createCollection(existing.map((row) => ({ ...row })));

		await grantSuperAdmin(assignments, 'user-uuid-1', false);

		for (const original of existing) {
			const found = assignments.docs.find(
				(doc: any) =>
					doc.roleKey === original.roleKey &&
					doc.scopeType === original.scopeType &&
					doc.scopeId === original.scopeId
			);
			expect(found).toMatchObject(original);
		}
		expect(assignments.docs).toHaveLength(existing.length + 1);
	});

	it('modifies no other user', async () => {
		const assignments = createCollection([
			{
				userId: 'someone-else',
				roleKey: 'Author',
				scopeType: 'global',
				scopeId: null,
				isActive: true
			}
		]);

		await grantSuperAdmin(assignments, 'user-uuid-1', false);

		const other = assignments.docs.find((doc: any) => doc.userId === 'someone-else');
		expect(other).toMatchObject({ roleKey: 'Author', isActive: true });
		expect(
			assignments.docs.filter((doc: any) => doc.roleKey === SUPER_ADMIN_ROLE_KEY)
		).toHaveLength(1);
	});

	it('never touches the user document, so the password and e-mail are untouched', async () => {
		const users = createCollection([{ ...EXISTING_USER }]);
		const assignments = createCollection([]);

		await findUserByEmail(users, 'cabralleonardoferreira@gmail.com');
		await grantSuperAdmin(assignments, 'user-uuid-1', false);

		expect(users.writes).toHaveLength(0);
		expect(users.docs[0]).toMatchObject({
			email: 'cabralleonardoferreira@gmail.com',
			password: '$2b$10$untouched',
			username: 'leo'
		});
	});
});
