export function normalizeId(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized || null;
    }
    if (typeof value === 'object') {
        if ('_id' in value && value._id) {
            return normalizeId(value._id);
        }

        // Keep support for custom "id" fields when they are plain strings.
        if ('id' in value && typeof value.id === 'string' && value.id.trim()) {
            return value.id.trim();
        }

        if (typeof value.toString === 'function') {
            const normalized = String(value.toString()).trim();
            if (normalized && normalized !== '[object Object]') {
                return normalized;
            }
        }

        return null;
    }
    return String(value).trim() || null;
}
