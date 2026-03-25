import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

function getStripe() {
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return null;
  }
  return new Stripe(stripeSecretKey);
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return json({
        error: 'Stripe is not configured on the server'
      }, { status: 500 });
    }

    const body = await request.json();
    const paymentIntentId = body?.paymentIntentId as string | undefined;

    if (!paymentIntentId) {
      return json({
        error: 'Must provide `paymentIntentId`'
      }, { status: 400 });
    }

    // Confirmar o payment intent para autorizar o bloqueio
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: body?.paymentMethodId as string | undefined
    });

    // Verificar se a verificação foi bem-sucedida
    if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
      return json({
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        message: paymentIntent.status === 'requires_capture' 
          ? 'Funds authorized successfully. Will be captured on publication.'
          : 'Payment successful'
      });
    } else {
      return json({
        success: false,
        error: `Payment intent status: ${paymentIntent.status}`,
        paymentIntentId: paymentIntent.id
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Stripe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({
      error: `Failed to confirm payment hold: ${errorMessage}`
    }, { status: 500 });
  }
};
