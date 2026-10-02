import UserSession from '$lib/db/models/UserSession';

type LoginUser = {
	id?: unknown;
	_id?: unknown;
	firstLoginAt?: unknown;
	lastLoginAt?: unknown;
};

type LoginDates = {
	firstLoginAt: Date | null;
	lastLoginAt: Date | null;
};

function validDates(values: unknown[]): Date[] {
	return values
		.filter((value) => value instanceof Date || (typeof value === 'string' && value.length > 0))
		.map((value) => new Date(value as string | Date))
		.filter((date) => Number.isFinite(date.getTime()))
		.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Session creation records a login; activity, renewal and account creation do not.
 * Expired sessions may already be deleted, so these are the earliest/latest
 * RECORDED logins, not a claim that historical session data is complete.
 */
export async function getUserLoginHistory(users: LoginUser[]): Promise<Map<string, LoginDates>> {
	const ids = [...new Set(users.flatMap((user) => [user.id, user._id]).filter(Boolean).map(String))];
	if (ids.length === 0) return new Map();

	const sessions = await UserSession.aggregate<{
		_id: string;
		firstLoginAt: Date;
		lastLoginAt: Date;
	}>([
		{ $match: { userId: { $in: ids } } },
		{
			$group: {
				_id: '$userId',
				firstLoginAt: { $min: '$createdAt' },
				lastLoginAt: { $max: '$createdAt' }
			}
		}
	]);
	const sessionsById = new Map(sessions.map((session) => [session._id, session]));

	return new Map(
		users.map((user) => {
			const byId = sessionsById.get(String(user.id));
			const byInternalId = sessionsById.get(String(user._id));
			const dates = validDates([
				user.firstLoginAt,
				user.lastLoginAt,
				byId?.firstLoginAt,
				byId?.lastLoginAt,
				byInternalId?.firstLoginAt,
				byInternalId?.lastLoginAt
			]);
			return [
				String(user.id || user._id),
				{
					firstLoginAt: dates[0] ?? null,
					lastLoginAt: dates[dates.length - 1] ?? null
				}
			];
		})
	);
}
