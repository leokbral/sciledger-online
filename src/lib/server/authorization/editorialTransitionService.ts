import mongoose from 'mongoose';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
import { authorize } from './authorizationService';
import { createEditorialAuditLog } from './audit';
import type { PermissionKey } from './permissions';
import { normalizeEntityId } from './roleResolver';
import { emitPaperLifecycleTransitionEvent } from '../paperLifecycleEvents';

export class EditorialTransitionError extends Error {
	status: number;
	code: string;
	currentStatus?: string;

	constructor(message: string, status = 400, code = 'editorial_transition_error') {
		super(message);
		this.name = 'EditorialTransitionError';
		this.status = status;
		this.code = code;
	}
}

export class EditorialConflictError extends EditorialTransitionError {
	constructor(currentStatus?: string) {
		super('O artigo foi alterado por outro usuario.', 409, 'status_conflict');
		this.currentStatus = currentStatus;
	}
}

type TransitionDefinition = {
	action: string;
	from: string[];
	to: string;
	permission: PermissionKey;
};

export const EDITORIAL_TRANSITIONS: Record<string, TransitionDefinition> = {
	'paper.submit': {
		action: 'paper.submit',
		from: ['draft'],
		to: 'reviewer assignment',
		permission: 'paper.submit'
	},
	'paper.sendToReview': {
		action: 'paper.sendToReview',
		from: ['reviewer assignment'],
		to: 'in review',
		permission: 'paper.sendToReview'
	},
	'paper.requestCorrections': {
		action: 'paper.requestCorrections',
		from: ['in review', 'under final review', 'awaiting final decision'],
		to: 'needing corrections',
		permission: 'paper.requestCorrections'
	},
	'paper.submitFinalReview': {
		action: 'paper.submitFinalReview',
		from: ['needing corrections', 'under correction'],
		to: 'in review',
		permission: 'paper.edit'
	},
	'paper.requestPublication': {
		action: 'paper.requestPublication',
		from: ['needing corrections', 'under correction'],
		to: 'reviewer assignment',
		permission: 'paper.edit'
	},
	'paper.accept': {
		action: 'paper.accept',
		from: ['awaiting final decision', 'in review'],
		to: 'accepted',
		permission: 'paper.accept'
	},
	'paper.reject': {
		action: 'paper.reject',
		from: [
			'draft',
			'reviewer assignment',
			'in review',
			'needing corrections',
			'under correction',
			'under final review',
			'awaiting final decision',
			'accepted'
		],
		to: 'rejected',
		permission: 'paper.reject'
	},
	'paper.rejectPublication': {
		action: 'paper.rejectPublication',
		from: ['reviewer assignment'],
		to: 'needing corrections',
		permission: 'paper.reject'
	},
	'paper.publish': {
		action: 'paper.publish',
		from: ['reviewer assignment', 'awaiting final decision', 'accepted'],
		to: 'published',
		permission: 'paper.publish'
	},
	'paper.publishStandalone': {
		action: 'paper.publishStandalone',
		from: ['needing corrections', 'under correction'],
		to: 'published',
		permission: 'paper.edit'
	},
	'paper.withdraw': {
		action: 'paper.withdraw',
		from: ['draft', 'reviewer assignment', 'in review', 'needing corrections', 'under correction'],
		to: 'draft',
		permission: 'paper.withdraw'
	},
	'paper.autoRequestCorrections': {
		action: 'paper.autoRequestCorrections',
		from: ['in review'],
		to: 'needing corrections',
		permission: 'review.submit'
	}
};

type TransitionPaperStatusInput = {
	user?: any;
	paperId: string;
	action: keyof typeof EDITORIAL_TRANSITIONS | string;
	expectedStatus: string;
	metadata?: Record<string, unknown>;
	extraSet?: Record<string, unknown>;
	system?: boolean;
	session?: mongoose.ClientSession | null;
};

function paperLookup(paperId: string) {
	return { $or: [{ id: String(paperId) }, { _id: String(paperId) }] };
}

function buildTransitionSet(action: string, to: string, extraSet: Record<string, unknown> = {}) {
	const now = new Date();
	const set: Record<string, unknown> = {
		status: to,
		updatedAt: now,
		...extraSet
	};

	if (action === 'paper.sendToReview') {
		set['peer_review.reviewStatus'] = 'in_progress';
		set['phaseTimestamps.round1Start'] = now;
	}

	if (action === 'paper.requestCorrections' || action === 'paper.autoRequestCorrections') {
		set['phaseTimestamps.correctionStart'] = now;
	}

	if (action === 'paper.submitFinalReview') {
		set.reviewRound = 2;
		set['phaseTimestamps.correctionEnd'] = now;
		set['phaseTimestamps.round2Start'] = now;
	}

	return set;
}

export async function transitionPaperStatus(input: TransitionPaperStatusInput) {
	await start_mongo();

	const definition = EDITORIAL_TRANSITIONS[input.action];
	if (!definition) {
		throw new EditorialTransitionError(`Transicao editorial desconhecida: ${input.action}`, 400, 'unknown_transition');
	}

	if (!definition.from.includes(input.expectedStatus)) {
		throw new EditorialTransitionError(
			`Transicao ${input.action} nao permite status anterior ${input.expectedStatus}.`,
			400,
			'invalid_expected_status'
		);
	}

	const run = async (session: mongoose.ClientSession) => {
		const paperBefore: any = await Papers.findOne({
			...paperLookup(input.paperId),
			status: input.expectedStatus
		}).session(session);

		if (!paperBefore) {
			const latest: any = await Papers.findOne(paperLookup(input.paperId))
				.select('status')
				.session(session)
				.lean();
			throw new EditorialConflictError(latest?.status);
		}

		let roleKeys = ['system'];

		if (!input.system) {
			const authorization = await authorize(
				input.user,
				definition.permission,
				{ paper: paperBefore },
				{ session }
			);

			if (!authorization.allowed) {
				throw new EditorialTransitionError('Permissao insuficiente para esta acao editorial.', 403, authorization.reason ?? 'forbidden');
			}

			roleKeys = authorization.roleKeys;
		}

		const updatedPaper = await Papers.findOneAndUpdate(
			{
				...paperLookup(input.paperId),
				status: input.expectedStatus
			},
			{
				$set: buildTransitionSet(input.action, definition.to, input.extraSet),
				$push: {
					statusHistory: {
						action: input.action,
						permissionKey: definition.permission,
						previousStatus: input.expectedStatus,
						newStatus: definition.to,
						userId: input.system ? null : normalizeEntityId(input.user),
						roleKeys,
						metadata: input.metadata ?? {},
						createdAt: new Date()
					}
				}
			},
			{ new: true, runValidators: true, session }
		);

		if (!updatedPaper) {
			const latest: any = await Papers.findOne(paperLookup(input.paperId))
				.select('status')
				.session(session)
				.lean();
			throw new EditorialConflictError(latest?.status);
		}

		await createEditorialAuditLog({
			user: input.system ? undefined : input.user,
			roleKeys,
			permissionKey: definition.permission,
			action: input.action,
			paperId: normalizeEntityId(updatedPaper),
			hubId: normalizeEntityId((updatedPaper as any).hubId),
			previousStatus: input.expectedStatus,
			newStatus: definition.to,
			metadata: input.metadata,
			session
		});

		return updatedPaper;
	};

	if (input.session) {
		const result = await run(input.session);
		try {
			await emitPaperLifecycleTransitionEvent(input.action, result, {
				actorId: input.system ? null : normalizeEntityId(input.user),
				metadata: {
					...(input.metadata ?? {}),
					previousStatus: input.expectedStatus,
					newStatus: definition.to,
					permissionKey: definition.permission,
					system: !!input.system
				}
			});
		} catch (eventError) {
			console.error('Failed to emit paper lifecycle event:', eventError);
		}
		return result;
	}

	const session = await mongoose.startSession();
	try {
		let result: any;
		await session.withTransaction(async () => {
			result = await run(session);
		});
		try {
			await emitPaperLifecycleTransitionEvent(input.action, result, {
				actorId: input.system ? null : normalizeEntityId(input.user),
				metadata: {
					...(input.metadata ?? {}),
					previousStatus: input.expectedStatus,
					newStatus: definition.to,
					permissionKey: definition.permission,
					system: !!input.system
				}
			});
		} catch (eventError) {
			console.error('Failed to emit paper lifecycle event:', eventError);
		}
		return result;
	} finally {
		await session.endSession();
	}
}
