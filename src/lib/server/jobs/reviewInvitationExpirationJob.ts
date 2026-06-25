import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { start_mongo } from '$lib/db/mongooseConnection';
import { emitPaperReviewInvitationEvent } from '$lib/server/reviewInvitationLifecycle';
import {
	buildPaperReviewerInvitationQuery,
	getInvitationPaperId,
	getInvitationReviewerId,
	getNewReviewInvitationExpiresAt,
	getReviewInvitationExpiresAt,
	REVIEW_INVITATION_EXPIRATION_DAYS,
	savePendingReviewInvitationOrFindExisting
} from '$lib/server/reviewInvitations';

const MAX_REVIEW_INVITATION_RESENDS = 2;
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;

let started = false;
let running = false;
let interval: ReturnType<typeof setInterval> | null = null;

function getIntervalMs() {
	const configured = Number(env.REVIEW_INVITATION_EXPIRATION_JOB_INTERVAL_MS || 0);
	return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INTERVAL_MS;
}

function getBatchSize() {
	const configured = Number(env.REVIEW_INVITATION_EXPIRATION_JOB_BATCH_SIZE || 0);
	return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_BATCH_SIZE;
}

function expiredPendingInvitationQuery(now: Date) {
	const legacyCutoff = new Date(
		now.getTime() - REVIEW_INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
	);

	return {
		status: 'pending',
		$or: [
			{ expiresAt: { $lte: now } },
			{
				expiresAt: { $exists: false },
				$or: [{ createdAt: { $lte: legacyCutoff } }, { invitedAt: { $lte: legacyCutoff } }]
			},
			{
				expiresAt: null,
				$or: [{ createdAt: { $lte: legacyCutoff } }, { invitedAt: { $lte: legacyCutoff } }]
			}
		]
	};
}

async function createResentInvitation(expiredInvitation: any, now: Date) {
	const paperId = getInvitationPaperId(expiredInvitation);
	const reviewerId = getInvitationReviewerId(expiredInvitation);
	const parentInvitationId = String(expiredInvitation.id || expiredInvitation._id);
	const resendCount = Number(expiredInvitation.resendCount || 0) + 1;

	const existingReplacement = await PaperReviewInvitation.findOne({
		parentInvitationId,
		status: 'pending'
	});
	if (existingReplacement) {
		return {
			invitation: existingReplacement,
			created: false,
			reason: 'existing_parent_replacement'
		};
	}

	const existingActiveReplacement = await PaperReviewInvitation.findOne({
		$and: [
			buildPaperReviewerInvitationQuery([paperId], [reviewerId]),
			{
				status: 'pending',
				expiresAt: { $gt: now }
			}
		]
	});
	if (existingActiveReplacement) {
		return {
			invitation: existingActiveReplacement,
			created: false,
			reason: 'existing_active_pending'
		};
	}

	const inviteId = crypto.randomUUID();
	const resentInvitation = new PaperReviewInvitation({
		_id: inviteId,
		id: inviteId,
		paperId,
		paper: expiredInvitation.paper || paperId,
		reviewerId,
		reviewer: expiredInvitation.reviewer || reviewerId,
		invitedBy: expiredInvitation.invitedBy,
		hubId: expiredInvitation.hubId || null,
		status: 'pending',
		duplicateOf: null,
		customDeadlineDays: expiredInvitation.customDeadlineDays || 15,
		resendCount,
		parentInvitationId,
		invitedAt: now,
		expiresAt: getNewReviewInvitationExpiresAt(now),
		createdAt: now,
		updatedAt: now
	});

	const saveResult = await savePendingReviewInvitationOrFindExisting(
		resentInvitation,
		[paperId],
		[reviewerId]
	);

	return {
		invitation: saveResult.invitation,
		created: saveResult.created,
		reason: saveResult.created ? 'created' : 'duplicate_key_existing_pending'
	};
}

async function processExpiredInvitation(invitation: any, now: Date) {
	const expiresAt = getReviewInvitationExpiresAt(invitation, now);
	const expiredInvitation = await PaperReviewInvitation.findOneAndUpdate(
		{
			_id: invitation._id,
			...expiredPendingInvitationQuery(now)
		},
		{
			$set: {
				status: 'expired',
				expiresAt,
				expiredAt: now,
				updatedAt: now
			}
		},
		{ new: true }
	);

	if (!expiredInvitation) {
		return { expired: false, resent: false };
	}

	await emitPaperReviewInvitationEvent('review.invitation.expired', expiredInvitation, {
		actorId: null,
		metadata: {
			automatic: true,
			finalExpiration: Number(expiredInvitation.resendCount || 0) >= MAX_REVIEW_INVITATION_RESENDS
		}
	});

	if (Number(expiredInvitation.resendCount || 0) >= MAX_REVIEW_INVITATION_RESENDS) {
		return { expired: true, resent: false };
	}

	const resendResult = await createResentInvitation(expiredInvitation, now);
	if (!resendResult.created) {
		return { expired: true, resent: false };
	}

	await emitPaperReviewInvitationEvent('review.invitation.resent', resendResult.invitation, {
		actorId: null,
		metadata: {
			automatic: true,
			previousInvitationId: String(expiredInvitation.id || expiredInvitation._id)
		}
	});

	return { expired: true, resent: true };
}

export async function runReviewInvitationExpirationJob(now = new Date()) {
	if (running) {
		return { skipped: true, reason: 'already_running' };
	}

	running = true;
	try {
		await start_mongo();
		const expiredInvitations = await PaperReviewInvitation.find(expiredPendingInvitationQuery(now))
			.sort({ expiresAt: 1, createdAt: 1, invitedAt: 1 })
			.limit(getBatchSize());

		let expired = 0;
		let resent = 0;

		for (const invitation of expiredInvitations) {
			try {
				const result = await processExpiredInvitation(invitation, now);
				if (result.expired) expired += 1;
				if (result.resent) resent += 1;
			} catch (error) {
				console.error('Failed to process expired paper review invitation:', error);
			}
		}

		return {
			skipped: false,
			scanned: expiredInvitations.length,
			expired,
			resent
		};
	} finally {
		running = false;
	}
}

export function startReviewInvitationExpirationJob() {
	if (started) {
		return;
	}

	started = true;
	void runReviewInvitationExpirationJob().catch((error) => {
		console.error('Initial review invitation expiration job failed:', error);
	});

	interval = setInterval(() => {
		void runReviewInvitationExpirationJob().catch((error) => {
			console.error('Review invitation expiration job failed:', error);
		});
	}, getIntervalMs());

	interval.unref?.();
}
