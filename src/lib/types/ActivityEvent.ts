export type ActivityEvent = {
	_id: string;
	type: string;
	actorId?: string | null;
	targetUserId?: string | null;
	entityType: string;
	entityId: string;
	idempotencyKey?: string;
	eventKey?: string;
	metadata: Record<string, unknown>;
	createdAt: Date;
};
