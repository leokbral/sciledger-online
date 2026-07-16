export const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_DURATION = 90 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_THROTTLE = 5 * 60 * 1000;

// Maximum number of active (non-revoked, non-expired) sessions a single user
// may hold at once. Once exceeded, the oldest active sessions are deleted --
// the session that was just created is never among them.
export const MAX_ACTIVE_SESSIONS = 10;
