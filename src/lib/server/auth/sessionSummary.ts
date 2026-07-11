export type SessionSummary = {
	sessionId: string;
	createdAt: Date;
	lastActivityAt: Date;
	expiresAt: Date;
	rememberMe: boolean;
	currentSession: boolean;
	userAgent: string;
	ip: string;
};

export type SessionSummarySource = {
	_id?: unknown;
	createdAt: Date;
	lastActivityAt: Date;
	expiresAt: Date;
	rememberMe: boolean;
	sessionTokenHash: string;
	userAgent?: string;
	ip?: string;
};

/**
 * The single place a UserSession document is shaped for the client. Only
 * these seven fields ever leave the server for a session list -- in
 * particular sessionTokenHash, revokedAt/revokedReason, and any other raw
 * Mongo fields are never included, regardless of what's added to the
 * UserSession schema in the future.
 */
export function toSessionSummary(
	session: SessionSummarySource,
	currentSessionTokenHash: string | null
): SessionSummary {
	return {
		sessionId: String(session._id),
		createdAt: session.createdAt,
		lastActivityAt: session.lastActivityAt,
		expiresAt: session.expiresAt,
		rememberMe: Boolean(session.rememberMe),
		currentSession:
			currentSessionTokenHash !== null && session.sessionTokenHash === currentSessionTokenHash,
		userAgent: session.userAgent || '',
		ip: session.ip || ''
	};
}
