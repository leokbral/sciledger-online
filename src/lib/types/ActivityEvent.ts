export type ActivityEvent = {
	_id: string;
	type: string;
	actorId?: string | null;
	targetUserId?: string | null;
	entityType: string;
	entityId: string;
	metadata: Record<string, unknown>;
	createdAt: Date;
};
