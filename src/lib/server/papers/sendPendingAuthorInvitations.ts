import { env } from '$env/dynamic/private';
import { emailService } from '$lib/utils/CoAuthorEmailService';
import {
	dispatchPendingAuthorInvitations,
	type PendingAuthorInvitation,
	type PendingInvitationSendResult
} from './pendingAuthorInvitations';

function resolveSiteUrl(requestOrigin?: string) {
	const siteUrl = env.SITE_URL || env.PUBLIC_SITE_URL || requestOrigin || 'http://localhost:5173';
	return siteUrl.replace(/\/+$/, '');
}

function authorDisplayName(invitation: PendingAuthorInvitation) {
	const name = `${invitation.firstName || ''} ${invitation.lastName || ''}`.trim();
	return name || invitation.email;
}

export type ProcessPendingInvitationsInput = {
	/** The paper document, already saved. */
	paper: {
		pendingAuthorInvitations?: unknown;
		title?: string;
		save: () => Promise<unknown>;
	};
	inviterName: string;
	requestOrigin?: string;
};

/**
 * Mails the paper's outstanding co-author invitations and records what went
 * out, then saves the paper again to persist those records.
 *
 * MUST be called only after the paper itself has been persisted. The ordering
 * is the whole point: the old flow mailed people the moment an ORCID result
 * was added to an unsaved form, so a submission that was never saved -- or was
 * abandoned -- had already contacted strangers, with no way to undo it.
 *
 * This never throws. A mail failure must not propagate into the save path that
 * already succeeded, or the person would be told their draft failed when it
 * did not. Failures stay on the entry and the next save retries them.
 *
 * The invitation points at the registration page rather than at password
 * recovery: a pending author has no account yet, so there is nothing to
 * recover.
 */
export async function processPendingAuthorInvitations(
	input: ProcessPendingInvitationsInput
): Promise<PendingInvitationSendResult[]> {
	const pending = Array.isArray(input.paper.pendingAuthorInvitations)
		? (input.paper.pendingAuthorInvitations as PendingAuthorInvitation[])
		: [];

	if (pending.length === 0) {
		return [];
	}

	// Nothing to do if every entry already went out: skip the save as well.
	if (pending.every((invitation) => invitation?.inviteSentAt)) {
		return pending.map((invitation) => ({
			id: invitation.id,
			email: invitation.email,
			status: 'skipped' as const,
			reason: 'already_sent'
		}));
	}

	const registrationUrl = `${resolveSiteUrl(input.requestOrigin)}/register`;

	try {
		const { invitations, results } = await dispatchPendingAuthorInvitations({
			invitations: pending,
			send: async (invitation) => {
				await emailService.sendCoAuthorWelcomeEmail({
					coAuthorName: authorDisplayName(invitation),
					coAuthorEmail: invitation.email,
					inviterName: input.inviterName,
					projectTitle: input.paper.title ?? '',
					loginUrl: registrationUrl
				});
			}
		});

		input.paper.pendingAuthorInvitations = invitations as unknown;
		await input.paper.save();

		return results;
	} catch (error) {
		// Only reachable if persisting the send record fails. The invitations
		// themselves are already out or already marked failed; swallowing here
		// keeps a saved draft from being reported as a failure.
		console.error('❌ Failed to record pending author invitation results:', error);
		return [];
	}
}
