import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { env } from '$env/dynamic/private';

function getStripe() {
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return null;
  }
  return new Stripe(stripeSecretKey);
}

export const POST: RequestHandler = async ({ request }) => {
  const stripe = getStripe();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';

  if (!stripe) {
    console.error('STRIPE_SECRET_KEY not configured');
    return json({ error: 'Stripe is not configured on the server' }, { status: 500 });
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    const signature = request.headers.get('stripe-signature') || '';
    const body = await request.text();

    // Verificar assinatura do webhook
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Inicializar MongoDB
    await start_mongo();

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const paperId = paymentIntent.metadata?.paperId;

  if (!paperId || paperId === 'pending') {
    console.log('Payment intent succeeded but no paper linked:', paymentIntent.id);
    return json({ received: true });
  }

  const paper = await Papers.findById(paperId);
  if (!paper || !paper.paymentHold) {
    console.log('Paper not found for payment intent:', paperId);
    return json({ received: true });
  }

  // Se está pending, mudar para authorized
  if (paper.paymentHold.status === 'pending') {
    paper.paymentHold.status = 'authorized';
    paper.paymentHold.authorizedAt = new Date(paymentIntent.created * 1000);
    await paper.save();
    console.log(`Payment hold authorized for paper ${paperId}`);
  }

  return json({ received: true });
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  const paperId = paymentIntent.metadata?.paperId;

  if (!paperId || paperId === 'pending') {
    return json({ received: true });
  }

  const paper = await Papers.findById(paperId);
  if (!paper || !paper.paymentHold) {
    return json({ received: true });
  }

  // Marcar como falho
  paper.paymentHold.status = 'failed';
  paper.paymentHold.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
  await paper.save();

  console.log(`Payment hold failed for paper ${paperId}: ${paper.paymentHold.failureReason}`);
  return json({ received: true });
}

async function handlePaymentIntentCanceled(paymentIntent: any) {
  const paperId = paymentIntent.metadata?.paperId;

  if (!paperId || paperId === 'pending') {
    return json({ received: true });
  }

  const paper = await Papers.findById(paperId);
  if (!paper || !paper.paymentHold) {
    return json({ received: true });
  }

  // Marcar como liberado se não foi capturado
  if (paper.paymentHold.status !== 'captured') {
    paper.paymentHold.status = 'released';
    paper.paymentHold.releasedAt = new Date();
    paper.paymentHold.failureReason = 'Payment intent canceled';
    await paper.save();

    console.log(`Payment hold released for paper ${paperId}`);
  }

  return json({ received: true });
}

async function handleChargeRefunded(charge: any) {
  // Encontrar o paper pelo payment intent
  const paymentIntentId = charge.payment_intent;

  const paper = await Papers.findOne({
    'paymentHold.stripePaymentIntentId': paymentIntentId
  });

  if (!paper) {
    console.log('Paper not found for refunded charge:', paymentIntentId);
    return json({ received: true });
  }

  // Atualizar status para liberado se foi capturado
  if (paper.paymentHold?.status === 'captured') {
    paper.paymentHold.status = 'released';
    paper.paymentHold.releasedAt = new Date();
    paper.paymentHold.failureReason = `Refunded: ${charge.amount / 100} ${charge.currency.toUpperCase()}`;
    await paper.save();

    console.log(`Payment refunded for paper ${paper.id}:`, charge.refunds.data[0]?.reason || 'No reason');
  }

  return json({ received: true });
}
