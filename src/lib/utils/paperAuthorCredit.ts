import {
	getAuthorReferenceId,
	normalizeAuthorText,
	type PaperAuthorSnapshot
} from './paperAuthorAffiliations';

export const CREDIT_AUTHOR_ROLES = [
	'Conceptualization',
	'Data curation',
	'Formal analysis',
	'Funding acquisition',
	'Investigation',
	'Methodology',
	'Project administration',
	'Resources',
	'Software',
	'Supervision',
	'Validation',
	'Visualization',
	'Writing - original draft',
	'Writing - review and editing'
] as const;

export type CreditAuthorRole = (typeof CREDIT_AUTHOR_ROLES)[number];

export interface CreditAuthorStatementSnapshot {
	userId?: string;
	username?: string;
	authorName?: string;
	roles: CreditAuthorRole[];
	statement?: string;
	updatedAt?: Date | string;
}

interface NormalizeCreditAuthorStatementsOptions {
	includeEmptyAuthors?: boolean;
}

type CreditAuthorReference = Pick<PaperAuthorSnapshot, 'userId' | 'username' | 'name'> &
	Partial<CreditAuthorStatementSnapshot>;

const CREDIT_AUTHOR_ROLE_BY_KEY = new Map(
	CREDIT_AUTHOR_ROLES.map((role) => [normalizeCreditRoleKey(role), role])
);

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function normalizeCreditRoleKey(value: unknown): string {
	return normalizeAuthorText(value)
		.replace(/[–—]/g, '-')
		.replace(/\s*&\s*/g, ' and ')
		.replace(/\s*-\s*/g, ' - ')
		.replace(/\s+/g, ' ')
		.toLowerCase();
}

export function normalizeCreditAuthorRole(value: unknown): CreditAuthorRole | null {
	return CREDIT_AUTHOR_ROLE_BY_KEY.get(normalizeCreditRoleKey(value)) ?? null;
}

function getAuthorDisplayName(record: Record<string, unknown>): string {
	const authorName = normalizeAuthorText(record.authorName);
	if (authorName) return authorName;

	const name = normalizeAuthorText(record.name);
	if (name) return name;

	const firstName = normalizeAuthorText(record.firstName);
	const lastName = normalizeAuthorText(record.lastName);
	const fullName = `${firstName} ${lastName}`.trim();
	if (fullName) return fullName;

	return normalizeAuthorText(record.username) || normalizeAuthorText(record.email);
}

export function normalizeCreditAuthorReference(input: unknown): CreditAuthorReference | null {
	if (typeof input === 'string' || typeof input === 'number') {
		const userId = normalizeAuthorText(input);
		return userId ? { userId, name: userId, roles: [] } : null;
	}

	const record = asRecord(input);
	if (!record) return null;

	const userId = getAuthorReferenceId(record);
	const username = normalizeAuthorText(record.username);
	const name = getAuthorDisplayName(record);

	if (!userId && !username && !name) return null;

	return {
		userId,
		username,
		name: name || username || userId,
		authorName: name || username || userId,
		roles: []
	};
}

function normalizeCreditAuthorStatementRecord(input: unknown): CreditAuthorStatementSnapshot | null {
	const record = asRecord(input);
	if (!record) return null;

	const userId = getAuthorReferenceId(record);
	const username = normalizeAuthorText(record.username);
	const authorName = getAuthorDisplayName(record);
	const roles = Array.isArray(record.roles)
		? [
				...new Set(
					record.roles
						.map((role) => normalizeCreditAuthorRole(role))
						.filter((role): role is CreditAuthorRole => Boolean(role))
				)
			]
		: [];

	if (!userId && !username && !authorName && roles.length === 0) return null;

	return {
		userId,
		username,
		authorName,
		roles,
		statement: normalizeAuthorText(record.statement),
		updatedAt:
			record.updatedAt instanceof Date || typeof record.updatedAt === 'string'
				? (record.updatedAt as Date | string)
				: undefined
	};
}

function identityKeys(reference: CreditAuthorReference | CreditAuthorStatementSnapshot): string[] {
	return [
		reference.userId ? `id:${normalizeCreditRoleKey(reference.userId)}` : '',
		reference.username ? `username:${normalizeCreditRoleKey(reference.username)}` : '',
		reference.authorName ? `name:${normalizeCreditRoleKey(reference.authorName)}` : '',
		'name' in reference && reference.name ? `name:${normalizeCreditRoleKey(reference.name)}` : ''
	].filter(Boolean);
}

function primaryIdentityKey(reference: CreditAuthorReference | CreditAuthorStatementSnapshot): string {
	return (
		identityKeys(reference)[0] ??
		`anonymous:${normalizeCreditRoleKey(reference.authorName || ('name' in reference ? reference.name : ''))}`
	);
}

function findMatchingAuthor(
	statement: CreditAuthorStatementSnapshot,
	authors: CreditAuthorReference[]
): CreditAuthorReference | null {
	const statementKeys = new Set(identityKeys(statement));
	return authors.find((author) => identityKeys(author).some((key) => statementKeys.has(key))) ?? null;
}

function formatStatement(authorName: string, roles: CreditAuthorRole[]): string {
	return roles.length > 0 ? `${authorName}: ${roles.join(', ')}` : '';
}

export function validateCreditAuthorStatementsInput(
	input: unknown,
	authors: unknown[]
): { ok: true; message: '' } | { ok: false; message: string } {
	if (input === undefined || input === null) return { ok: true, message: '' };
	if (!Array.isArray(input)) {
		return { ok: false, message: 'CRediT Author statements must be an array.' };
	}

	const authorReferences = authors
		.map((author) => normalizeCreditAuthorReference(author))
		.filter((author): author is CreditAuthorReference => Boolean(author));

	for (const item of input) {
		const record = asRecord(item);
		if (!record) {
			return { ok: false, message: 'Each CRediT Author statement must be an object.' };
		}

		if (record.roles !== undefined && !Array.isArray(record.roles)) {
			return { ok: false, message: 'CRediT Author roles must be an array.' };
		}

		const rawRoles = Array.isArray(record.roles) ? record.roles : [];
		for (const role of rawRoles) {
			if (!normalizeCreditAuthorRole(role)) {
				return {
					ok: false,
					message: `Unsupported CRediT Author role: ${normalizeAuthorText(role)}.`
				};
			}
		}

		const statement = normalizeCreditAuthorStatementRecord(record);
		if (statement && statement.roles.length > 0 && authorReferences.length > 0) {
			if (!findMatchingAuthor(statement, authorReferences)) {
				return {
					ok: false,
					message: 'CRediT Author statements must be assigned to paper authors.'
				};
			}
		}
	}

	return { ok: true, message: '' };
}

export function normalizeCreditAuthorStatements(
	input: unknown,
	authors: unknown[],
	options: NormalizeCreditAuthorStatementsOptions = {}
): CreditAuthorStatementSnapshot[] {
	const authorReferences = authors
		.map((author) => normalizeCreditAuthorReference(author))
		.filter((author): author is CreditAuthorReference => Boolean(author));
	const statementsByKey = new Map<string, CreditAuthorStatementSnapshot>();

	if (Array.isArray(input)) {
		for (const item of input) {
			const statement = normalizeCreditAuthorStatementRecord(item);
			if (!statement) continue;

			const author = findMatchingAuthor(statement, authorReferences);
			if (!author && authorReferences.length > 0) continue;

			const target = author ?? normalizeCreditAuthorReference(statement);
			if (!target) continue;

			const key = primaryIdentityKey(target);
			const existing = statementsByKey.get(key);
			const roles = [
				...new Set([...(existing?.roles ?? []), ...statement.roles])
			] as CreditAuthorRole[];
			const authorName = target.authorName || target.name || statement.authorName || statement.username || '';

			statementsByKey.set(key, {
				userId: target.userId || statement.userId,
				username: target.username || statement.username,
				authorName,
				roles,
				statement: statement.statement || formatStatement(authorName, roles),
				updatedAt: statement.updatedAt || existing?.updatedAt || new Date().toISOString()
			});
		}
	}

	if (options.includeEmptyAuthors) {
		for (const author of authorReferences) {
			const key = primaryIdentityKey(author);
			if (statementsByKey.has(key)) continue;

			const authorName = author.authorName || author.name || author.username || author.userId || '';
			statementsByKey.set(key, {
				userId: author.userId,
				username: author.username,
				authorName,
				roles: [],
				statement: '',
				updatedAt: undefined
			});
		}
	}

	const orderedKeys = [
		...authorReferences.map((author) => primaryIdentityKey(author)),
		...statementsByKey.keys()
	];

	return [...new Set(orderedKeys)]
		.map((key) => statementsByKey.get(key))
		.filter((statement): statement is CreditAuthorStatementSnapshot => {
			if (!statement) return false;
			return options.includeEmptyAuthors || statement.roles.length > 0;
		})
		.map((statement) => ({
			...statement,
			statement: statement.statement || formatStatement(statement.authorName || '', statement.roles)
		}));
}
