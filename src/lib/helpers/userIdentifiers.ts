import Users from '$lib/db/models/User';

type UserReference =
	| string
	| null
	| undefined
	| {
			id?: string | null;
			_id?: string | null;
	  };

export async function resolveUserIdentifiers(userRef: UserReference): Promise<{
	canonicalId: string | null;
	aliases: string[];
}> {
	const rawId =
		typeof userRef === 'string'
			? userRef
			: typeof userRef === 'object' && userRef
				? String(userRef.id || userRef._id || '')
				: '';

	const normalizedInput = String(rawId || '').trim();
	const aliases = new Set<string>();

	if (normalizedInput) {
		aliases.add(normalizedInput);
	}

	if (!normalizedInput) {
		return {
			canonicalId: null,
			aliases: []
		};
	}

	const user = await Users.findOne({
		$or: [{ id: normalizedInput }, { _id: normalizedInput }]
	})
		.select('_id id')
		.lean();

	if (user?._id) {
		aliases.add(String(user._id));
	}

	if (user?.id) {
		aliases.add(String(user.id));
	}

	return {
		canonicalId: user?.id ? String(user.id) : normalizedInput,
		aliases: Array.from(aliases)
	};
}
