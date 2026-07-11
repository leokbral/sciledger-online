import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { normalizeEmail } from './normalizeEmail';

export type EmailReviewerInvitationRecord = Record<string, unknown> & {
	email: string;
	status: string;
	expiresAt: Date;
	token: string;
	save?: () => Promise<unknown>;
};

type EmailReviewerInvitationModelLike = {
	findOne(query: Record<string, unknown>): PromiseLike<EmailReviewerInvitationRecord | null>;
};

function getEmailReviewerInvitationModel(): EmailReviewerInvitationModelLike {
	return (
		mongoose.models.EmailReviewerInvitation ||
		mongoose.model('EmailReviewerInvitation', EmailReviewerInvitationSchema)
	);
}

/**
 * Single source of truth for "is this invitation currently usable": status
 * must still be pending and it must not be expired. /register,
 * /invite/register and /api/email-reviewer-invitation/convert all evaluate
 * activity through this one predicate so none of them can drift into a
 * slightly different status/expiry check.
 */
export function isEmailReviewerInvitationActive(
	invitation: Pick<EmailReviewerInvitationRecord, 'status' | 'expiresAt'>,
	now: Date = new Date()
): boolean {
	return invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() > now.getTime();
}

/**
 * Looks up an invitation strictly by token, without judging validity. Lets
 * callers that need granular error messages (e.g. the invite landing page)
 * distinguish "not found" from "found but inactive" -- the pass/fail
 * decision itself always goes through isEmailReviewerInvitationActive.
 */
export async function findEmailReviewerInvitationByToken(
	token: unknown,
	model: EmailReviewerInvitationModelLike = getEmailReviewerInvitationModel()
): Promise<EmailReviewerInvitationRecord | null> {
	if (typeof token !== 'string' || !token.trim()) {
		return null;
	}

	return model.findOne({ token });
}

/**
 * The invite belongs to the (token, email) pair, not the token alone: any
 * consumer with an email to check (registration, hub conversion) must
 * confirm it matches the invitation's email before treating it as valid for
 * that action. Shared by /register, /invite/register and
 * /api/email-reviewer-invitation/convert so the criteria never diverges.
 */
export async function findValidEmailReviewerInvitation(
	token: unknown,
	email: string,
	model: EmailReviewerInvitationModelLike = getEmailReviewerInvitationModel()
): Promise<EmailReviewerInvitationRecord | null> {
	const invitation = await findEmailReviewerInvitationByToken(token, model);
	if (!invitation || !isEmailReviewerInvitationActive(invitation)) {
		return null;
	}

	if (normalizeEmail(String(invitation.email || '')) !== email) {
		return null;
	}

	return invitation;
}
