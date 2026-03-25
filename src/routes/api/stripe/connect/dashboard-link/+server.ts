import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { createConnectDashboardLink, getStripeClient } from '$lib/services/stripeConnect';

export const POST: RequestHandler = async ({ locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const userDoc = await Users.findOne({ id: user.id }).lean();
		if (!userDoc) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const accountId = userDoc.reviewerPayments?.stripeConnectAccountId as string | undefined;
		if (!accountId) {
			return json({ error: 'No Stripe Connect account found for this reviewer' }, { status: 400 });
		}

		const stripe = getStripeClient();
		if (!stripe) {
			return json({ error: 'Stripe is not configured on the server' }, { status: 500 });
		}

		const dashboardUrl = await createConnectDashboardLink(stripe, accountId);
		return json({ success: true, dashboardUrl });
	} catch (error: unknown) {
		console.error('Error creating Stripe dashboard link:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to create dashboard link: ${message}` }, { status: 500 });
	}
};
