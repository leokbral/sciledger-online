import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';

const TOTAL_AMOUNT_BRL_CENTS = 40000; // R$ 400,00

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

    console.log('Updating paper with payment authorization code:', paperId, paymentAuthorizationCode);

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

    console.log('Paper updated with payment authorization:', updatedPaper.id);

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
