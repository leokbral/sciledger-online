import crypto from 'crypto';
import UserSession, { type IUserSession } from '$lib/db/models/UserSession';
import {
	MAX_ACTIVE_SESSIONS,
	REMEMBER_ME_DURATION,
	SESSION_DURATION,
	SESSION_RENEW_THRESHOLD,
	SESSION_TOUCH_THROTTLE
} from './sessionConstants';

export {
	MAX_ACTIVE_SESSIONS,
	REMEMBER_ME_DURATION,
	SESSION_DURATION,
	SESSION_RENEW_THRESHOLD,
	SESSION_TOUCH_THROTTLE
};

export type SessionInput = {
	userId: string;
	rememberMe?: boolean;
	ip?: string;
	userAgent?: string;
	expiresAt?: Date;
};

export type SessionServiceOptions = {
	now?: Date;
};

export type CreatedSession = {
	session: IUserSession;
	sessionToken: string;
};

export type RevokeAllUserSessionsResult = {
	matchedCount: number;
	modifiedCount: number;
};

export type SessionDocumentLike = {
	_id?: unknown;
	userId: string;
	sessionTokenHash: string;
	createdAt: Date;
	updatedAt: Date;
	lastActivityAt: Date;
	expiresAt: Date;
	rememberMe: boolean;
	ip?: string;
	userAgent?: string;
	revokedAt?: Date | null;
	revokedReason?: string;
	save(): Promise<unknown>;
};

type SessionQueryLike<TSession> = {
	sort(sortSpec: Record<string, 1 | -1>): PromiseLike<TSession[]>;
};

type SessionModelLike<TSession extends SessionDocumentLike = IUserSession> = {
	create(data: Record<string, unknown>): Promise<TSession>;
	findOne(query: Record<string, unknown>): PromiseLike<TSession | null>;
	find(query: Record<string, unknown>): SessionQueryLike<TSession>;
	updateMany(
		query: Record<string, unknown>,
		update: Record<string, unknown>
	): PromiseLike<{ matchedCount?: number; modifiedCount?: number; nModified?: number }>;
	deleteMany(query: Record<string, unknown>): PromiseLike<{ deletedCount?: number }>;
};

function resolveNow(options?: SessionServiceOptions) {
	return options?.now ? new Date(options.now) : new Date();
}

function getSessionDuration(rememberMe: boolean | undefined) {
	return rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;
}

function resolveExpiresAt(input: SessionInput, now: Date) {
	if (input.expiresAt) return new Date(input.expiresAt);

	return new Date(now.getTime() + getSessionDuration(input.rememberMe));
}

export function isExpired(session: Pick<SessionDocumentLike, 'expiresAt'>, options?: SessionServiceOptions) {
	const now = resolveNow(options);
	return new Date(session.expiresAt).getTime() <= now.getTime();
}

function isSessionActive(session: SessionDocumentLike, options?: SessionServiceOptions) {
	if (session.revokedAt) return false;
	return !isExpired(session, options);
}

export function shouldTouchSession(
	session: Pick<SessionDocumentLike, 'lastActivityAt'>,
	options?: SessionServiceOptions
) {
	const now = resolveNow(options);
	const lastActivityAt = new Date(session.lastActivityAt).getTime();
	return now.getTime() - lastActivityAt >= SESSION_TOUCH_THROTTLE;
}

export function shouldRenew(
	session: Pick<SessionDocumentLike, 'expiresAt' | 'rememberMe' | 'revokedAt'>,
	options?: SessionServiceOptions
) {
	if (session.revokedAt || isExpired(session, options)) return false;

	const now = resolveNow(options);
	const expiresAt = new Date(session.expiresAt).getTime();
	return expiresAt - now.getTime() < SESSION_RENEW_THRESHOLD;
}

export function generateSessionToken() {
	return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(sessionToken: string) {
	return crypto.createHash('sha256').update(sessionToken).digest('hex');
}

export function createSessionService<TSession extends SessionDocumentLike = IUserSession>(
	model: SessionModelLike<TSession> = UserSession as SessionModelLike<TSession>
) {
	async function enforceMaxActiveSessions(
		userId: string,
		currentSessionId: unknown,
		options?: SessionServiceOptions
	) {
		const now = resolveNow(options);
		const activeSessions = await model
			.find({
				userId,
				revokedAt: null,
				expiresAt: { $gt: now }
			})
			.sort({ createdAt: 1 }); // oldest first

		const excessCount = activeSessions.length - MAX_ACTIVE_SESSIONS;
		if (excessCount <= 0) return;

		const deletableIds = activeSessions
			.filter((activeSession) => String(activeSession._id) !== String(currentSessionId))
			.slice(0, excessCount)
			.map((activeSession) => activeSession._id);

		if (deletableIds.length === 0) return;

		await model.deleteMany({ _id: { $in: deletableIds } });
	}

	async function createSession(input: SessionInput, options?: SessionServiceOptions) {
		const now = resolveNow(options);
		const sessionToken = generateSessionToken();
		const sessionTokenHash = hashSessionToken(sessionToken);
		const expiresAt = resolveExpiresAt(input, now);

		const session = await model.create({
			userId: input.userId,
			sessionTokenHash,
			createdAt: now,
			updatedAt: now,
			lastActivityAt: now,
			expiresAt,
			rememberMe: Boolean(input.rememberMe),
			ip: input.ip || '',
			userAgent: input.userAgent || ''
		});

		try {
			await enforceMaxActiveSessions(input.userId, session._id, options);
		} catch (error) {
			// Trimming old sessions must never block a legitimate login.
			console.error('Failed to enforce MAX_ACTIVE_SESSIONS:', error);
		}

		return { session, sessionToken };
	}

	async function findSession(sessionToken: string) {
		if (!sessionToken) return null;

		return model.findOne({
			sessionTokenHash: hashSessionToken(sessionToken)
		});
	}

	async function validateSession(sessionToken: string, options?: SessionServiceOptions) {
		const session = await findSession(sessionToken);
		if (!session) return null;

		return isSessionActive(session, options) ? session : null;
	}

	async function touchSession(sessionToken: string, options?: SessionServiceOptions) {
		const session = await validateSession(sessionToken, options);
		if (!session) return null;

		const now = resolveNow(options);
		session.lastActivityAt = now;
		session.updatedAt = now;
		await session.save();

		return session;
	}

	async function renewSession(
		sessionToken: string,
		input: Pick<SessionInput, 'expiresAt' | 'rememberMe'> = {},
		options?: SessionServiceOptions
	) {
		const session = await validateSession(sessionToken, options);
		if (!session) return null;

		const now = resolveNow(options);
		const expiresAt = resolveExpiresAt(
			{
				userId: session.userId,
				rememberMe: input.rememberMe ?? session.rememberMe,
				expiresAt: input.expiresAt
			},
			now
		);

		session.expiresAt = expiresAt;
		session.rememberMe = input.rememberMe ?? session.rememberMe;
		session.updatedAt = now;
		await session.save();

		return session;
	}

	async function renewIfNecessary(sessionToken: string, options?: SessionServiceOptions) {
		const session = await validateSession(sessionToken, options);
		if (!session) return null;
		if (!shouldRenew(session, options)) return session;

		const now = resolveNow(options);
		session.expiresAt = new Date(now.getTime() + getSessionDuration(session.rememberMe));
		session.updatedAt = now;
		await session.save();

		return session;
	}

	async function revokeSession(
		sessionToken: string,
		revokedReason = 'revoked',
		options?: SessionServiceOptions
	) {
		const session = await findSession(sessionToken);
		if (!session) return null;

		const now = resolveNow(options);
		session.revokedAt = session.revokedAt || now;
		session.revokedReason = revokedReason;
		session.updatedAt = now;
		await session.save();

		return session;
	}

	async function revokeAllUserSessions(
		userId: string,
		revokedReason = 'revoked_all',
		options?: SessionServiceOptions
	): Promise<RevokeAllUserSessionsResult> {
		const now = resolveNow(options);
		const result = await model.updateMany(
			{
				userId,
				revokedAt: null
			},
			{
				$set: {
					revokedAt: now,
					revokedReason,
					updatedAt: now
				}
			}
		);

		return {
			matchedCount: result.matchedCount ?? result.modifiedCount ?? result.nModified ?? 0,
			modifiedCount: result.modifiedCount ?? result.nModified ?? 0
		};
	}

	/** All active (non-revoked, non-expired) sessions for a user, newest activity first. */
	async function listActiveSessions(userId: string, options?: SessionServiceOptions) {
		const now = resolveNow(options);
		return model
			.find({
				userId,
				revokedAt: null,
				expiresAt: { $gt: now }
			})
			.sort({ lastActivityAt: -1 });
	}

	/**
	 * Revokes a single session by its id, scoped to the owning user so one
	 * account can never revoke another account's session by guessing an id.
	 */
	async function revokeSessionById(
		sessionId: string,
		userId: string,
		revokedReason = 'revoked',
		options?: SessionServiceOptions
	) {
		const session = await model.findOne({ _id: sessionId, userId });
		if (!session) return null;

		const now = resolveNow(options);
		session.revokedAt = session.revokedAt || now;
		session.revokedReason = revokedReason;
		session.updatedAt = now;
		await session.save();

		return session;
	}

	/** Revokes every active session for a user except the one given by id. */
	async function revokeAllUserSessionsExcept(
		userId: string,
		exceptSessionId: string,
		revokedReason = 'revoked_all_except_current',
		options?: SessionServiceOptions
	): Promise<RevokeAllUserSessionsResult> {
		const now = resolveNow(options);
		const result = await model.updateMany(
			{
				userId,
				revokedAt: null,
				_id: { $ne: exceptSessionId }
			},
			{
				$set: {
					revokedAt: now,
					revokedReason,
					updatedAt: now
				}
			}
		);

		return {
			matchedCount: result.matchedCount ?? result.modifiedCount ?? result.nModified ?? 0,
			modifiedCount: result.modifiedCount ?? result.nModified ?? 0
		};
	}

	return {
		createSession,
		findSession,
		isExpired,
		shouldRenew,
		validateSession,
		touchSession,
		renewSession,
		renewIfNecessary,
		revokeSession,
		revokeAllUserSessions,
		listActiveSessions,
		revokeSessionById,
		revokeAllUserSessionsExcept
	};
}

export const SessionService = createSessionService();

export const createSession = SessionService.createSession;
export const findSession = SessionService.findSession;
export const validateSession = SessionService.validateSession;
export const touchSession = SessionService.touchSession;
export const renewSession = SessionService.renewSession;
export const renewIfNecessary = SessionService.renewIfNecessary;
export const revokeSession = SessionService.revokeSession;
export const revokeAllUserSessions = SessionService.revokeAllUserSessions;
export const listActiveSessions = SessionService.listActiveSessions;
export const revokeSessionById = SessionService.revokeSessionById;
export const revokeAllUserSessionsExcept = SessionService.revokeAllUserSessionsExcept;
