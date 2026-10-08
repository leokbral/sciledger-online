import { Schema } from 'mongoose';
import * as crypto from 'crypto';

/**
 * A half-finished ORCID sign-up.
 *
 * When ORCID authenticates someone whose record exposes no public e-mail, the
 * platform cannot tell whether that person already has an account here. It
 * used to invent a `<orcid>@orcid.placeholder` address and create a second,
 * orphan account on the spot. This collection replaces that: the ORCID
 * identity is parked here until the person proves control of a real address,
 * and only then is an account created or an existing one linked.
 *
 * Deliberately NOT stored: the ORCID access and refresh tokens. Nothing in the
 * codebase reads them (every projection excludes them), so parking secrets
 * here would be risk without purpose. The ordinary login paths refresh them on
 * the next ORCID sign-in.
 *
 * Documents expire by themselves -- see the TTL index at the bottom. An
 * abandoned claim leaves nothing behind.
 */
export const OrcidSignupClaimSchema: Schema = new Schema(
	{
		_id: { type: String, default: () => crypto.randomUUID() },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },

		/** The ORCID iD being claimed. One live claim per iD: a restart replaces it. */
		orcid: { type: String, required: true, unique: true },

		/** Names as ORCID reported them, used to seed the account on confirmation. */
		firstName: { type: String, default: '' },
		lastName: { type: String, default: '' },

		/**
		 * The address the person typed, still unproven. Absent until they
		 * submit one. Never written onto a user document from here -- only the
		 * confirmation endpoint promotes it, after the token matches.
		 */
		pendingEmail: { type: String },

		/** SHA-256 of the confirmation token. The raw token only ever leaves in the e-mail. */
		tokenHash: { type: String },

		expiresAt: { type: Date, required: true },
		createdAt: { type: Date, default: () => new Date() },
		updatedAt: { type: Date, default: () => new Date() }
	},
	{ collection: 'orcidSignupClaims', timestamps: true }
);

OrcidSignupClaimSchema.index({ orcid: 1 }, { unique: true });

// Sparse: `tokenHash` is absent until the confirmation e-mail is sent, and
// several claims may sit in that state at once.
OrcidSignupClaimSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });

// TTL index: MongoDB deletes the document once expiresAt is in the past.
// expireAfterSeconds: 0 means "expire exactly at expiresAt" -- no cron job.
OrcidSignupClaimSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
