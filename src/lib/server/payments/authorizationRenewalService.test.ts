import { describe, expect, it } from 'vitest';
import {
	AUTHORIZATION_DURATION_DAYS,
	RENEWAL_BEFORE_EXPIRATION_DAYS,
	getAuthorizationExpiresAt,
	shouldRenewAuthorization,
	shouldStopAuthorizationRenewal
} from './authorizationRenewalService';

describe('authorization renewal policy', () => {
	it('uses the expected 7-day authorization and 1-day renewal window', () => {
		expect(AUTHORIZATION_DURATION_DAYS).toBe(7);
		expect(RENEWAL_BEFORE_EXPIRATION_DAYS).toBe(1);
		expect(getAuthorizationExpiresAt(new Date('2026-01-01T00:00:00.000Z'))).toEqual(
			new Date('2026-01-08T00:00:00.000Z')
		);
	});

	it('renews an authorized manual hold on day 6 while waiting for reviewers', () => {
		const attempt = {
			status: 'authorized',
			captureMethod: 'manual',
			providerPaymentIntentId: 'pi_old',
			providerPaymentMethodId: 'pm_saved',
			authorizationExpiresAt: new Date('2026-01-08T00:00:00.000Z')
		};
		const paper = { status: 'reviewer assignment', reviewers: [], peer_review: { responses: [] } };

		expect(
			shouldRenewAuthorization(attempt, paper, new Date('2026-01-07T00:00:00.000Z'))
		).toBe(true);
	});

	it('does not renew before the renewal window or after a reviewer is found', () => {
		const attempt = {
			status: 'authorized',
			captureMethod: 'manual',
			providerPaymentIntentId: 'pi_old',
			providerPaymentMethodId: 'pm_saved',
			authorizationExpiresAt: new Date('2026-01-08T00:00:00.000Z')
		};

		expect(
			shouldRenewAuthorization(
				attempt,
				{ status: 'reviewer assignment', reviewers: [] },
				new Date('2026-01-06T23:59:59.000Z')
			)
		).toBe(false);
		expect(
			shouldRenewAuthorization(
				attempt,
				{ status: 'reviewer assignment', reviewers: ['reviewer-1'] },
				new Date('2026-01-07T00:00:00.000Z')
			)
		).toBe(false);
	});

	it('stops renewal for terminal payments and papers no longer waiting for reviewers', () => {
		expect(shouldStopAuthorizationRenewal({ status: 'captured' }, { status: 'reviewer assignment' })).toBe(
			true
		);
		expect(shouldStopAuthorizationRenewal({ status: 'authorized' }, { status: 'in review' })).toBe(
			true
		);
		expect(
			shouldStopAuthorizationRenewal(
				{ status: 'authorized' },
				{ status: 'reviewer assignment', peer_review: { responses: [{ status: 'accepted' }] } }
			)
		).toBe(true);
	});
});
