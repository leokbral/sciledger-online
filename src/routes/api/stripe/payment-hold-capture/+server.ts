import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { env } from '$env/dynamic/private';

function getStripe() {
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return null;
  return new Stripe(stripeSecretKey);
}

function getReceiptUrl(paymentIntent: Stripe.PaymentIntent): string | null {
  const latestCharge = paymentIntent.latest_charge;
  if (typeof latestCharge === 'object' && latestCharge && 'receipt_url' in latestCharge) {
    return (latestCharge as Stripe.Charge).receipt_url ?? null;
  }
  return null;
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const paperId = body?.paperId as string | undefined;

  if (!paperId) {
    return json({ error: 'Must provide `paperId`' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return json({ error: 'Stripe is not configured on the server' }, { status: 500 });
  }

  try {
    await start_mongo();
    const paper = await Papers.findById(paperId);

    if (!paper) {
      return json({ error: 'Paper not found' }, { status: 404 });
    }

    if (!paper.paymentHold || !paper.paymentHold.stripePaymentIntentId) {
      return json({ error: 'No payment hold found for this paper', paperId }, { status: 400 });
    }

    if (paper.paymentHold.status === 'captured') {
      return json({
        success: true,
        message: 'Payment already captured',
        paymentIntentId: paper.paymentHold.stripePaymentIntentId,
        capturedAt: paper.paymentHold.capturedAt
      });
    }

    if (paper.paymentHold.status !== 'authorized') {
      return json({
        error: `Cannot capture payment with status: ${paper.paymentHold.status}`,
        paperId
      }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.capture(paper.paymentHold.stripePaymentIntentId);
    const receiptUrl = getReceiptUrl(paymentIntent);

    paper.paymentHold.status = 'captured';
    paper.paymentHold.capturedAt = new Date();
    paper.paymentHold.receiptUrl = receiptUrl;
    await paper.save();

    return json({
      success: true,
      message: 'Payment captured successfully',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      capturedAt: paper.paymentHold.capturedAt,
      receiptUrl
    });
  } catch (error) {
    console.error('Stripe capture error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: `Failed to capture payment: ${errorMessage}` }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const paperId = url.searchParams.get('paperId') ?? undefined;

  if (!paperId) {
    return json({ error: 'Must provide `paperId` parameter' }, { status: 400 });
  }

  try {
    await start_mongo();
    const paper = await Papers.findById(paperId);

    if (!paper) {
      return json({ error: 'Paper not found' }, { status: 404 });
    }

    if (!paper.paymentHold) {
      return json({ error: 'No payment hold found for this paper', paperId }, { status: 404 });
    }

    return json({
      paperId,
      paymentHold: {
        status: paper.paymentHold.status,
        amount: paper.paymentHold.amount,
        currency: paper.paymentHold.currency,
        authorizedAt: paper.paymentHold.authorizedAt,
        capturedAt: paper.paymentHold.capturedAt,
        releasedAt: paper.paymentHold.releasedAt,
        stripePaymentIntentId: paper.paymentHold.stripePaymentIntentId
      }
    });
  } catch (error) {
    console.error('Capture status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: `Failed to retrieve payment hold: ${errorMessage}` }, { status: 500 });
  }
};
