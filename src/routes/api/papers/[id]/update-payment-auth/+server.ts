import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { emitEvent } from '$lib/services/EventService';

const TOTAL_AMOUNT_BRL_CENTS = 40000; // R$ 400,00

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

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const paperId = params.id;
    if (!paperId) {
      return json({
        error: 'Paper ID is required'
      }, { status: 400 });
    }

    await start_mongo();

    const body = await request.json();
    const paymentAuthorizationCode = body?.paymentAuthorizationCode as string | undefined;

    if (!paymentAuthorizationCode) {
      return json({
        error: 'Payment authorization code is required'
      }, { status: 400 });
    }

    const previousPaper = await Papers.findById(paperId).lean();
    const updatedPaper = await Papers.findByIdAndUpdate(
      paperId,
      {
        $set: {
          'paymentHold.stripePaymentIntentId': paymentAuthorizationCode,
          'paymentHold.status': 'authorized',
          'paymentHold.authorizedAt': new Date(),
          'paymentHold.amount': TOTAL_AMOUNT_BRL_CENTS,
          'paymentHold.currency': 'brl'
        }
      },
      { new: true, runValidators: false }
    );

    if (!updatedPaper) {
      console.error('Paper not found:', paperId);
      return json({
        error: 'Paper not found'
      }, { status: 404 });
    }

    if (previousPaper?.paymentHold?.status !== 'authorized') {
      const recipients = getPaperRecipients(updatedPaper);
      if (recipients.length > 0) {
        try {
          await emitEvent({
            type: 'payment.hold.authorized',
            actorId: null,
            recipients,
            entityType: 'paper',
            entityId: String(updatedPaper.id || updatedPaper._id),
            metadata: {
              paperId: String(updatedPaper.id || updatedPaper._id),
              paperTitle: updatedPaper.title,
              amount: updatedPaper.paymentHold?.amount,
              currency: updatedPaper.paymentHold?.currency || 'brl',
              paymentStatus: updatedPaper.paymentHold?.status,
              stripePaymentIntentId: updatedPaper.paymentHold?.stripePaymentIntentId,
              recipientRoles: Object.fromEntries(recipients.map((recipientId) => [recipientId, 'author']))
            }
          });
        } catch (eventError) {
          console.error('Failed to emit payment hold authorized event:', eventError);
        }
      }
    }

    return json({
      success: true,
      paper: updatedPaper
    });
  } catch (error) {
    console.error('Error updating payment authorization:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({
      error: `Failed to update payment authorization: ${errorMessage}`
    }, { status: 500 });
  }
};
