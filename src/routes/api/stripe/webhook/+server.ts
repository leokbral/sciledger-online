import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import {
	recordStripeChargeRefundedWebhook,
	recordStripePaymentIntentWebhook
} from '$lib/server/payments/paperPaymentService';
import { getStripeClient } from '$lib/server/payments/stripeClient';

export const POST: RequestHandler = async ({ request }) => {
	const stripe = getStripeClient();
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';

	if (!stripe) {
		console.error('STRIPE_SECRET_KEY not configured');
		return json({ error: 'Stripe is not configured on the server' }, { status: 500 });
	}

	if (!webhookSecret) {
		console.error('STRIPE_WEBHOOK_SECRET not configured');
		return json({ error: 'Webhook secret not configured' }, { status: 500 });
	}

	const signature = request.headers.get('stripe-signature') || '';
	const body = await request.text();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (error) {
		console.error('Webhook signature verification failed:', error);
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	try {
		switch (event.type) {
			case 'payment_intent.succeeded':
			case 'payment_intent.payment_failed':
			case 'payment_intent.canceled':
			case 'payment_intent.processing':
			case 'payment_intent.requires_action':
				await recordStripePaymentIntentWebhook({
					paymentIntent: event.data.object as Stripe.PaymentIntent,
					stripeEventId: event.id,
					eventType: event.type
				});
				break;
			case 'charge.refunded':
				await recordStripeChargeRefundedWebhook({
					charge: event.data.object as Stripe.Charge,
					stripeEventId: event.id
				});
				break;
			default:
				break;
		}

		return json({ received: true });
	} catch (error) {
		console.error('Webhook processing error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
