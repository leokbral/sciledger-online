export type UserBillingStatus = 'current' | 'past_due' | 'delinquent' | 'blocked';

export class UserBillingStatusError extends Error {
	status: number;
	code: string;
	billingStatus: UserBillingStatus;

	constructor(message: string, billingStatus: UserBillingStatus) {
		super(message);
		this.name = 'UserBillingStatusError';
		this.status = 403;
		this.code = 'billing_status_blocks_submission';
		this.billingStatus = billingStatus;
	}
}

export function normalizeUserBillingStatus(user: any): UserBillingStatus {
	const status = String(user?.billingStatus ?? 'current');
	if (status === 'past_due' || status === 'delinquent' || status === 'blocked') {
		return status;
	}
	return 'current';
}

export function canUserSubmitPapers(user: any) {
	const billingStatus = normalizeUserBillingStatus(user);
	return billingStatus !== 'delinquent' && billingStatus !== 'blocked';
}

export function assertUserCanSubmitPapers(user: any) {
	const billingStatus = normalizeUserBillingStatus(user);
	if (!canUserSubmitPapers(user)) {
		throw new UserBillingStatusError(
			'Your billing status prevents new paper submissions. Please resolve outstanding payments before submitting.',
			billingStatus
		);
	}
}
