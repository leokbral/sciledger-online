type HubLike = {
    createdBy?: any;
    assistantManagers?: any[];
};

export function normalizeId(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        return String(value._id || value.id || value).trim() || null;
    }
    return String(value).trim() || null;
}

export function getHubOwnerId(hub: HubLike | null | undefined): string | null {
    if (!hub) return null;
    return normalizeId(hub.createdBy);
}

export function isHubOwner(hub: HubLike | null | undefined, userId: string): boolean {
    const ownerId = getHubOwnerId(hub);
    return !!ownerId && ownerId === userId;
}

export function isHubViceManager(hub: HubLike | null | undefined, userId: string): boolean {
    if (!hub || !Array.isArray(hub.assistantManagers)) return false;
    return hub.assistantManagers.some((manager) => normalizeId(manager) === userId);
}

export function canManageHub(hub: HubLike | null | undefined, userId: string): boolean {
    return isHubOwner(hub, userId) || isHubViceManager(hub, userId);
}
