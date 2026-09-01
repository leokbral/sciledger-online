import { env } from '$env/dynamic/private';
import type { PaymentAttemptPurpose } from '$lib/types/PaymentAttempt';

const DEFAULT_STANDALONE_SUBMISSION_AMOUNT_CENTS = 40000;
const DEFAULT_STANDALONE_SUBMISSION_CURRENCY = 'brl';

function readPositiveInteger(value: string | undefined, fallback: number) {
	const parsed = Number.parseInt(String(value ?? ''), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCurrency(value: string | undefined, fallback: string) {
	const normalized = String(value ?? '').trim().toLowerCase();
	return /^[a-z]{3}$/.test(normalized) ? normalized : fallback;
}

export function getStandaloneSubmissionPaymentConfig() {
	return {
		amountCents: readPositiveInteger(
			env.STANDALONE_SUBMISSION_FEE_CENTS ?? env.PAPER_SUBMISSION_FEE_CENTS,
			DEFAULT_STANDALONE_SUBMISSION_AMOUNT_CENTS
		),
		currency: normalizeCurrency(
			env.STANDALONE_SUBMISSION_FEE_CURRENCY ?? env.PAPER_SUBMISSION_FEE_CURRENCY,
			DEFAULT_STANDALONE_SUBMISSION_CURRENCY
		)
	};
}

export function getPaperPaymentConfig(purpose: PaymentAttemptPurpose) {
	const fallback = getStandaloneSubmissionPaymentConfig();

	if (purpose === 'standalone_submission') {
		return fallback;
	}

	const amountByPurpose: Record<PaymentAttemptPurpose, string | undefined> = {
		standalone_submission: env.STANDALONE_SUBMISSION_FEE_CENTS ?? env.PAPER_SUBMISSION_FEE_CENTS,
		hub_submission: env.HUB_SUBMISSION_FEE_CENTS ?? env.PAPER_SUBMISSION_FEE_CENTS,
		hub_review: env.HUB_REVIEW_FEE_CENTS ?? env.PAPER_REVIEW_FEE_CENTS,
		hub_publication: env.HUB_PUBLICATION_FEE_CENTS ?? env.PAPER_PUBLICATION_FEE_CENTS
	};

	const currencyByPurpose: Record<PaymentAttemptPurpose, string | undefined> = {
		standalone_submission:
			env.STANDALONE_SUBMISSION_FEE_CURRENCY ?? env.PAPER_SUBMISSION_FEE_CURRENCY,
		hub_submission: env.HUB_SUBMISSION_FEE_CURRENCY ?? env.PAPER_SUBMISSION_FEE_CURRENCY,
		hub_review: env.HUB_REVIEW_FEE_CURRENCY ?? env.PAPER_REVIEW_FEE_CURRENCY,
		hub_publication: env.HUB_PUBLICATION_FEE_CURRENCY ?? env.PAPER_PUBLICATION_FEE_CURRENCY
	};

	return {
		amountCents: readPositiveInteger(amountByPurpose[purpose], fallback.amountCents),
		currency: normalizeCurrency(currencyByPurpose[purpose], fallback.currency)
	};
}
