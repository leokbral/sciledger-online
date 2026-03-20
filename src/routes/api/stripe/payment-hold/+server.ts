import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const TOTAL_AMOUNT_BRL_CENTS = 40000; // R$ 400,00
const PLATFORM_FEE_BRL_CENTS = 16000; // R$ 160,00
const REVIEWER_FEE_BRL_CENTS = 8000; // R$ 80,00 por revisor
const REVIEWERS_COUNT = 3;

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
      console.error('STRIPE_SECRET_KEY not found in environment');
      return json({
        error: 'Stripe is not configured on the server'
      }, { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return json({
        error: 'Invalid request body'
      }, { status: 400 });
    }

    const amount = TOTAL_AMOUNT_BRL_CENTS;
    const currency = 'brl';
    const email = body?.email as string | undefined;
    const paperId = body?.paperId as string | undefined;
    const description = body?.description as string | undefined;

    if (!email) {
      console.warn('Email not provided in payment hold request. Using placeholder.');
      // Use placeholder email if not provided
    }

    console.log('Creating payment intent for amount:', amount, 'currency:', currency, 'email:', email);

    // Criar um Payment Intent com confirmação automática
    // Este vai autorizar o valor sem capturar imediatamente
    const paymentIntentData: any = {
      amount,
      currency: currency as any,
      payment_method_types: ['card'],
      capture_method: 'manual',
      statement_descriptor_suffix: 'Payment Hold',
      metadata: {
        paperId: paperId || 'pending',
        type: 'payment_hold',
        description: description || 'Publication Fee Hold',
        feeModel: 'fixed_400_brl',
        platformFeeBrlCents: String(PLATFORM_FEE_BRL_CENTS),
        reviewerFeeBrlCents: String(REVIEWER_FEE_BRL_CENTS),
        reviewersCount: String(REVIEWERS_COUNT)
      }
    };

    // Only include receipt_email if email is provided
    if (email) {
      paymentIntentData.receipt_email = email;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    console.log('Payment intent created:', paymentIntent.id);

    return json({ 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
      status: paymentIntent.status
    });
  } catch (error) {
    console.error('Stripe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({
      error: `Failed to create payment hold: ${errorMessage}`
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return json({
        error: 'Stripe is not configured on the server'
      }, { status: 500 });
    }

    const paymentIntentId = url.searchParams.get('id') as string | undefined;

    if (!paymentIntentId) {
      return json({
        error: 'Must provide `id` parameter with Payment Intent ID'
      }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });
  } catch (error) {
    console.error('Stripe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({
      error: `Failed to retrieve payment intent: ${errorMessage}`
    }, { status: 500 });
  }
};
