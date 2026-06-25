import { Schema } from 'mongoose';

export const ActivityEventSchema: Schema = new Schema(
	{
		type: { type: String, required: true },
		actorId: { type: String, ref: 'User', default: null },
		targetUserId: { type: String, ref: 'User', default: null },
		entityType: { type: String, required: true },
		entityId: { type: String, required: true },
		idempotencyKey: { type: String },
		eventKey: { type: String },
		metadata: { type: Schema.Types.Mixed, default: {} },
		createdAt: { type: Date, default: () => new Date() }
	},
	{
		collection: 'activityEvents'
	}
);

ActivityEventSchema.index({ targetUserId: 1, createdAt: -1 });
ActivityEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
ActivityEventSchema.index({ actorId: 1, createdAt: -1 });
ActivityEventSchema.index({ type: 1, createdAt: -1 });
ActivityEventSchema.index(
	{ eventKey: 1 },
	{ unique: true, sparse: true, name: 'unique_activity_event_key' }
);
ActivityEventSchema.index({ idempotencyKey: 1, createdAt: -1 });
