import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.preview'
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const priceId = body?.priceId as string | undefined;
  const quantity = typeof body?.quantity === 'number' ? body.quantity : 1;
  const amount = typeof body?.amount === 'number' ? body.amount : undefined;
  const currency = (body?.currency as string | undefined)?.toLowerCase();
  const productName = (body?.productName as string | undefined) ?? 'SciLedger Payment';

  // Prefer using a Stripe Price ID, but allow an ad-hoc price via price_data for quick testing.
  if (!priceId && (amount === undefined || !currency)) {
    return json({
      error:
        'Must provide `priceId` or (`amount` + `currency`). Example: { "amount": 1000, "currency": "brl" }'
    }, { status: 400 });
  }

  const lineItem = priceId
    ? { price: priceId, quantity }
    : {
        price_data: {
          currency,
          product_data: { name: productName },
          unit_amount: amount
        },
        quantity
      };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [lineItem],
    success_url: `${process.env.SITE_URL ?? ''}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_URL ?? ''}/payment-cancelled`
  });

  return json({ url: session.url });
};
