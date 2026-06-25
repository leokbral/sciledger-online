import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { env } from '$env/dynamic/private';
import { emitEvent } from '$lib/services/EventService';

function getStripe() {
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return null;
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

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const paperId = body?.paperId as string | undefined;
  const reason = body?.reason as string | undefined;

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

    if (paper.paymentHold.status === 'released') {
      return json({
        success: true,
        message: 'Payment hold already released',
        paymentIntentId: paper.paymentHold.stripePaymentIntentId,
        releasedAt: paper.paymentHold.releasedAt
      });
    }

    if (paper.paymentHold.status === 'captured') {
      return json({
        error: 'Cannot release a captured payment. Please process a refund instead.',
        paperId,
        requiresRefund: true
      }, { status: 400 });
    }

    if (paper.paymentHold.status !== 'authorized' && paper.paymentHold.status !== 'pending') {
      return json({
        error: `Cannot release payment with status: ${paper.paymentHold.status}`,
        paperId
      }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.cancel(paper.paymentHold.stripePaymentIntentId);

    paper.paymentHold.status = 'released';
    paper.paymentHold.releasedAt = new Date();
    paper.paymentHold.failureReason = reason || 'Paper rejected or cancelled';
    await paper.save();

    const recipients = getPaperRecipients(paper);
    if (recipients.length > 0) {
      try {
        await emitEvent({
          type: 'payment.hold.released',
          actorId: null,
          recipients,
          entityType: 'paper',
          entityId: String(paper.id || paper._id),
          metadata: {
            paperId: String(paper.id || paper._id),
            paperTitle: paper.title,
            amount: paper.paymentHold.amount,
            currency: paper.paymentHold.currency || 'brl',
            paymentStatus: paper.paymentHold.status,
            stripePaymentIntentId: paper.paymentHold.stripePaymentIntentId,
            reason: paper.paymentHold.failureReason,
            recipientRoles: Object.fromEntries(recipients.map((recipientId) => [recipientId, 'author']))
          }
        });
      } catch (eventError) {
        console.error('Failed to emit payment hold released event:', eventError);
      }
    }

    return json({
      success: true,
      message: 'Payment hold released successfully',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      releasedAt: paper.paymentHold.releasedAt,
      reason: paper.paymentHold.failureReason
    });
  } catch (error) {
    console.error('Stripe release error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: `Failed to release payment hold: ${errorMessage}` }, { status: 500 });
  }
};
