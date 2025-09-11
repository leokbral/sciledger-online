export function sanitize(obj: unknown): unknown {
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	} else if (obj && typeof obj === 'object') {
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			const value = (obj as Record<string, unknown>)[key];

			if (value?.constructor?.name === 'ObjectId' && typeof value.toString === 'function') {
				clean[key] = value.toString();
			} else if (value instanceof Date) {
				clean[key] = value.toISOString();
			} else {
				clean[key] = sanitize(value);
			}
		}
		return clean;
	}
	return obj;
}
