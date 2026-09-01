import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { getStandaloneSubmissionPaymentConfig } from '$lib/server/payments/paymentConfig';
import { loadPaperPaymentState } from '$lib/server/payments/paperPaymentService';

function getStripeKeyMode(key: string | undefined | null) {
	if (!key) return null;
	if (key.startsWith('pk_test_') || key.startsWith('sk_test_')) return 'test';
	if (key.startsWith('pk_live_') || key.startsWith('sk_live_')) return 'live';
	return 'unknown';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Procurar pela chave pública do Stripe em várias locais
	// Suporta múltiplas convenções de nomes
	const stripePublicKey =
		env.VITE_STRIPE_PUBLIC_KEY ||
		env.STRIPE_PUBLIC_KEY ||
		env.VITE_STRIPE_PUBLISHABLE_KEY ||
		env.STRIPE_PUBLISHABLE_KEY ||
		process.env.VITE_STRIPE_PUBLIC_KEY ||
		process.env.STRIPE_PUBLIC_KEY ||
		process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
		process.env.STRIPE_PUBLISHABLE_KEY;
	const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
	const publicMode = getStripeKeyMode(stripePublicKey);
	const secretMode = getStripeKeyMode(stripeSecretKey);

	if (!stripePublicKey) {
		console.error('Stripe public key is not configured. Expected one of:');
		console.error('  - VITE_STRIPE_PUBLIC_KEY');
		console.error('  - STRIPE_PUBLIC_KEY');
		console.error('  - VITE_STRIPE_PUBLISHABLE_KEY');
		console.error('  - STRIPE_PUBLISHABLE_KEY');
		return {
			user: locals.user,
			stripePublicKey: null,
			error: 'Payment system is not configured. Please contact support.',
			...getStandaloneSubmissionPaymentConfig()
		};
	}
	if (!stripeSecretKey) {
		return {
			user: locals.user,
			stripePublicKey: null,
			error: 'Payment system is not configured. Stripe secret key is missing.',
			...getStandaloneSubmissionPaymentConfig()
		};
	}
	if (publicMode !== 'test' && publicMode !== 'live') {
		return {
			user: locals.user,
			stripePublicKey: null,
			error: 'Payment system is misconfigured. Stripe publishable key is invalid.',
			...getStandaloneSubmissionPaymentConfig()
		};
	}
	if (secretMode && secretMode !== 'unknown' && publicMode !== secretMode) {
		return {
			user: locals.user,
			stripePublicKey: null,
			error: 'Payment system is misconfigured. Stripe public and secret keys use different modes.',
			...getStandaloneSubmissionPaymentConfig()
		};
	}

	const paperId = url.searchParams.get('paperId');
	let paymentState = null;
	let paymentContext = getStandaloneSubmissionPaymentConfig();
	if (paperId) {
		try {
			const state = await loadPaperPaymentState(paperId, locals.user);
			paymentState = {
				state: state.state,
				status: (state.attempt as any)?.status ?? null,
				providerStatus: (state.attempt as any)?.providerStatus ?? null,
				paymentIntentId: (state.attempt as any)?.providerPaymentIntentId ?? null,
				receiptUrl: (state.attempt as any)?.receiptUrl ?? null,
				policy: state.policy,
				purpose: state.purpose,
				policyVersion: state.policyVersion
			};
			paymentContext = {
				amountCents: state.amountCents,
				currency: state.currency
			};
		} catch (error) {
			console.error('Failed to load paper payment state:', error);
		}
	}

	return {
		user: locals.user,
		stripePublicKey,
		...paymentContext,
		paymentState,
		paymentPolicyAccepted: Boolean(paymentState?.state === 'captured')
	};
};
