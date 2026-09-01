import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export function getStripeClient() {
	const stripeSecretKey = env.STRIPE_SECRET_KEY;
	if (!stripeSecretKey) {
		return null;
	}

	return new Stripe(stripeSecretKey);
}
