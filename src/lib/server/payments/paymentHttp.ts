import { json } from '@sveltejs/kit';
import { PaymentDomainError } from './paperPaymentService';

export function paymentErrorResponse(error: unknown, fallbackMessage: string) {
	if (error instanceof PaymentDomainError) {
		return json(
			{
				error: error.message,
				code: error.code,
				...(error.details ? { details: error.details } : {})
			},
			{ status: error.status }
		);
	}

	console.error(fallbackMessage, error);
	return json(
		{
			error: fallbackMessage,
			details: error instanceof Error ? error.message : 'Unknown error'
		},
		{ status: 500 }
	);
}
