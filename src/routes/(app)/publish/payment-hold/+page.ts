import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	const serverData = data as any;
	return {
		...serverData,
		user: serverData.user,
		stripePublicKey: serverData.stripePublicKey,
		error: serverData.error,
		amountCents: serverData.amountCents,
		currency: serverData.currency,
		paymentState: serverData.paymentState,
		paymentPolicyAccepted: serverData.paymentPolicyAccepted
	};
};
