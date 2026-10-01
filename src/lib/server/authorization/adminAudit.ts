import type mongoose from 'mongoose';
import ActivityEvent from '$lib/db/models/ActivityEvent';
import { normalizeEntityId } from './roleResolver';

/** Resource kinds the platform administration area can act on. */
export type AdminAuditResourceType =
	'platform' | 'user' | 'hub' | 'paper' | 'review' | 'invitation' | 'activity';

export type AdminAuditAction =
	| 'admin.dashboard.view'
	| 'admin.user.view'
	| 'admin.hub.view'
	| 'admin.paper.view'
	| 'admin.review.view'
	| 'admin.invitation.view'
	| 'admin.activity.view'
	| (string & {});

type AdminAuditInput = {
	/** The acting super administrator. */
	actor?: any;
	action: AdminAuditAction;
	resourceType: AdminAuditResourceType;
	/** Identifier of the resource, or a stable label such as 'dashboard' for list views. */
	resourceId: string;
	result?: 'allowed' | 'denied';
	metadata?: Record<string, unknown>;
	session?: mongoose.ClientSession | null;
};

/**
 * Admin audit events reuse the existing `activityEvents` collection rather than
 * introducing a fourth audit store next to `EditorialAuditLog` and `RbacAuditLog`.
 * It already carries `actorId`, `entityType`, `entityId`, `metadata` and `createdAt`,
 * and already indexes `{ actorId: 1, createdAt: -1 }`, which is exactly the access
 * pattern the admin activity screen needs.
 *
 * `eventKey` is deliberately left unset: it has a unique sparse index, and admin
 * reads are legitimately repeatable, so they must not be collapsed or rejected as
 * duplicates. `EventService.emitEvent` is intentionally not used either, because it
 * is recipient-centric and would fan out notifications and e-mail for what is a
 * pure audit record.
 *
 * Callers must pass only non-sensitive metadata. Never pass passwords, password
 * hashes, tokens, refresh tokens, secrets or private keys.
 */
export async function recordAdminAuditEvent(input: AdminAuditInput) {
	const actorId = input.actor ? (normalizeEntityId(input.actor) ?? null) : null;

	try {
		const docs = await ActivityEvent.create(
			[
				{
					type: input.action,
					actorId,
					targetUserId: input.resourceType === 'user' ? input.resourceId : null,
					entityType: input.resourceType,
					entityId: input.resourceId,
					metadata: {
						...(input.metadata ?? {}),
						result: input.result ?? 'allowed'
					},
					createdAt: new Date()
				}
			],
			{ session: input.session ?? undefined }
		);

		return docs[0];
	} catch (auditError) {
		// An audit write must never take down the page the administrator asked for.
		console.error('Failed to record admin audit event:', auditError);
		return null;
	}
}
