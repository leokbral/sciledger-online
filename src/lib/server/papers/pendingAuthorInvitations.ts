import * as crypto from 'crypto';
import { normalizeAndValidateEmail } from '$lib/server/auth/normalizeEmail';
import {
	normalizeAffiliationSnapshot,
	type PaperAuthorAffiliationSnapshot
} from '$lib/utils/paperAuthorAffiliations';

/**
 * Co-authors named during submission who have no SciLedger account.
 *
 * Adding one used to create an account and mail the person on the spot, from
 * an unsaved form. These now ride along with the paper and are contacted only
 * after it is persisted -- see `dispatchPendingAuthorInvitations`.
 */
export type PendingAuthorInvitation = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	orcid: string;
	order: number;
	isCorresponding: boolean;
	department: string;
	affiliation: string;
	affiliations: PaperAuthorAffiliationSnapshot[];
	createdAt?: Date | string;
	inviteSentAt?: Date | string | null;
	lastInviteError?: string;
};

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Accepts whatever the client sent and returns only well-formed entries.
 *
 * An entry without a valid e-mail is dropped rather than repaired: the e-mail
 * is the whole point of a pending author, since it is both the identity we
 * have and the only way to reach them.
 *
 * `inviteSentAt` is deliberately NOT read from the request. A client that
 * could set it would be able to suppress an invitation, and one that could
 * clear it would be able to force a resend; it is owned by the server alone.
 */
export function normalizePendingAuthorInvitations(input: unknown): PendingAuthorInvitation[] {
	if (!Array.isArray(input)) return [];

	const seenEmails = new Set<string>();
	const normalized: PendingAuthorInvitation[] = [];

	input.forEach((raw: any, index) => {
		const email = normalizeAndValidateEmail(raw?.email);
		if (!email) return;

		// One invitation per address per paper: a duplicate would mail the same
		// person twice for the same submission.
		if (seenEmails.has(email)) return;
		seenEmails.add(email);

		const affiliations = Array.isArray(raw?.affiliations)
			? raw.affiliations
					.map((affiliation: unknown, affiliationIndex: number) =>
						normalizeAffiliationSnapshot(affiliation, `pending-${index}-${affiliationIndex}`)
					)
					.filter(Boolean)
			: [];

		normalized.push({
			id: text(raw?.id) || crypto.randomUUID(),
			email,
			firstName: text(raw?.firstName),
			lastName: text(raw?.lastName),
			orcid: text(raw?.orcid),
			order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index,
			isCorresponding: raw?.isCorresponding === true,
			department: text(raw?.department),
			affiliation: text(raw?.affiliation),
			affiliations: affiliations as PaperAuthorAffiliationSnapshot[]
		});
	});

	return normalized;
}

/**
 * Merges the client's list onto what the paper already holds, carrying over
 * every `inviteSentAt` the server set before.
 *
 * Without this carry-over, each save would look like a fresh batch and mail
 * everyone again. Matching is by e-mail, which is stable across reorders and
 * survives a client that regenerates its local ids.
 */
export function mergePendingAuthorInvitations(
	existing: unknown,
	incoming: unknown
): PendingAuthorInvitation[] {
	const previous = Array.isArray(existing) ? existing : [];
	const sentByEmail = new Map<string, { inviteSentAt: Date | string; id: string }>();

	previous.forEach((entry: any) => {
		const email = normalizeAndValidateEmail(entry?.email);
		if (email && entry?.inviteSentAt) {
			sentByEmail.set(email, { inviteSentAt: entry.inviteSentAt, id: text(entry?.id) });
		}
	});

	return normalizePendingAuthorInvitations(incoming).map((entry) => {
		const alreadySent = sentByEmail.get(entry.email);
		if (!alreadySent) return entry;

		return {
			...entry,
			// Keep the original id too, so logs and audit trails stay joinable.
			id: alreadySent.id || entry.id,
			inviteSentAt: alreadySent.inviteSentAt
		};
	});
}

export type PendingInvitationSendResult = {
	id: string;
	email: string;
	status: 'sent' | 'skipped' | 'failed';
	reason?: string;
	error?: string;
};

export type DispatchPendingInvitationsInput = {
	invitations: unknown;
	/** Sends one invitation. Injected so the caller owns the transport. */
	send: (invitation: PendingAuthorInvitation) => Promise<void>;
	now?: () => Date;
};

/**
 * Mails the invitations that have not gone out yet, and reports what happened.
 *
 * Called ONLY after the paper has been persisted. Three guarantees it exists
 * to provide:
 *
 *  - an entry with `inviteSentAt` is skipped, so repeated saves, a retried
 *    request or a reload cannot send twice;
 *  - one address failing does not stop the others, mirroring the
 *    per-recipient isolation in `EmailEventDispatcher`;
 *  - nothing here can fail the save, because the save already happened. The
 *    caller persists the returned entries, so a failure leaves the draft
 *    intact and the invitation still pending.
 */
export async function dispatchPendingAuthorInvitations(
	input: DispatchPendingInvitationsInput
): Promise<{ invitations: PendingAuthorInvitation[]; results: PendingInvitationSendResult[] }> {
	const now = input.now ?? (() => new Date());
	const invitations = Array.isArray(input.invitations)
		? (input.invitations as PendingAuthorInvitation[])
		: [];
	const results: PendingInvitationSendResult[] = [];
	const updated: PendingAuthorInvitation[] = [];

	for (const invitation of invitations) {
		if (invitation?.inviteSentAt) {
			results.push({
				id: invitation.id,
				email: invitation.email,
				status: 'skipped',
				reason: 'already_sent'
			});
			updated.push(invitation);
			continue;
		}

		try {
			await input.send(invitation);
			results.push({ id: invitation.id, email: invitation.email, status: 'sent' });
			updated.push({ ...invitation, inviteSentAt: now(), lastInviteError: '' });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			results.push({
				id: invitation.id,
				email: invitation.email,
				status: 'failed',
				error: message
			});
			// Left without `inviteSentAt`, so the next save retries it.
			updated.push({ ...invitation, lastInviteError: message });
		}
	}

	return { invitations: updated, results };
}
