import { describe, expect, it } from 'vitest';
import {
	assertUserCanSubmitPapers,
	canUserSubmitPapers,
	normalizeUserBillingStatus
} from './userBillingStatusService';

describe('user billing status submission gate', () => {
	it('allows current and past_due users to submit under the current policy', () => {
		expect(canUserSubmitPapers({ billingStatus: 'current' })).toBe(true);
		expect(canUserSubmitPapers({ billingStatus: 'past_due' })).toBe(true);
		expect(normalizeUserBillingStatus({ billingStatus: 'unknown' })).toBe('current');
	});

	it('blocks delinquent and blocked users from submitting papers', () => {
		expect(canUserSubmitPapers({ billingStatus: 'delinquent' })).toBe(false);
		expect(canUserSubmitPapers({ billingStatus: 'blocked' })).toBe(false);
		expect(() => assertUserCanSubmitPapers({ billingStatus: 'delinquent' })).toThrow(
			/billing status prevents/
		);
	});
});
