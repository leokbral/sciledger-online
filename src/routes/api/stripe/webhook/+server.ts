import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { env } from '$env/dynamic/private';
import { emitEvent } from '$lib/services/EventService';

function getStripe() {
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return null;
  }
  return new Stripe(stripeSecretKey);
}

function normalizeUserId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.id) return String(value.id);
  if (value._id) return String(value._id);
  return String(value);
}

function getPaperRecipients(paper: any) {
  return [
    ...new Set(
      [
        normalizeUserId(paper.mainAuthor),
        normalizeUserId(paper.correspondingAuthor),
        normalizeUserId(paper.submittedBy),
        ...(paper.coAuthors || []).map(normalizeUserId),
        ...(paper.authors || []).map(normalizeUserId)
      ].filter(Boolean)
    )
  ];
}

async function emitPaymentEvent(
  type:
    | 'payment.hold.authorized'
    | 'payment.hold.failed'
    | 'payment.hold.released'
    | 'payment.refunded',
  paper: any,
  metadata: Record<string, unknown>
) {
  const recipients = getPaperRecipients(paper);
  if (recipients.length === 0) return;

  try {
    await emitEvent({
      type,
      actorId: null,
      recipients,
      entityType: 'paper',
      entityId: String(paper.id || paper._id),
      metadata: {
        paperId: String(paper.id || paper._id),
        paperTitle: paper.title,
        amount: paper.paymentHold?.amount,
        currency: paper.paymentHold?.currency || 'brl',
        paymentStatus: paper.paymentHold?.status,
        recipientRoles: Object.fromEntries(recipients.map((recipientId) => [recipientId, 'author'])),
        ...metadata
      }
    });
  } catch (eventError) {
    console.error(`Failed to emit ${type} event:`, eventError);
  }
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
		break;
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
    return json({ received: true });
  }

  const paper = await Papers.findById(paperId);
  if (!paper || !paper.paymentHold) {
    return json({ received: true });
  }

  // Se está pending, mudar para authorized
  if (paper.paymentHold.status === 'pending') {
    paper.paymentHold.status = 'authorized';
    paper.paymentHold.authorizedAt = new Date(paymentIntent.created * 1000);
    await paper.save();
    await emitPaymentEvent('payment.hold.authorized', paper, {
      stripePaymentIntentId: paymentIntent.id
    });
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

  const previousStatus = paper.paymentHold.status;

  // Marcar como falho
  paper.paymentHold.status = 'failed';
  paper.paymentHold.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
  await paper.save();
  if (previousStatus !== 'failed') {
    await emitPaymentEvent('payment.hold.failed', paper, {
      stripePaymentIntentId: paymentIntent.id,
      failureReason: paper.paymentHold.failureReason
    });
  }
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
    const previousStatus = paper.paymentHold.status;
    paper.paymentHold.status = 'released';
    paper.paymentHold.releasedAt = new Date();
    paper.paymentHold.failureReason = 'Payment intent canceled';
    await paper.save();
    if (previousStatus !== 'released') {
      await emitPaymentEvent('payment.hold.released', paper, {
        stripePaymentIntentId: paymentIntent.id,
        reason: paper.paymentHold.failureReason
      });
    }
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
    return json({ received: true });
  }

  // Atualizar status para liberado se foi capturado
  if (paper.paymentHold?.status === 'captured') {
    paper.paymentHold.status = 'released';
    paper.paymentHold.releasedAt = new Date();
    paper.paymentHold.failureReason = `Refunded: ${charge.amount / 100} ${charge.currency.toUpperCase()}`;
    await paper.save();
    await emitPaymentEvent('payment.refunded', paper, {
      stripePaymentIntentId: String(paymentIntentId || ''),
      amount: charge.amount,
      currency: charge.currency,
      reason: paper.paymentHold.failureReason
    });
  }

  return json({ received: true });
}
