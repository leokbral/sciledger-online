// arquivo: src/routes/api/email/coauthor/+server.ts
import { json } from '@sveltejs/kit';
import { emailService } from '$lib/utils/CoAuthorEmailService';
import { normalizeAndValidateEmail } from '$lib/server/auth/normalizeEmail';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();

		const { coAuthorName, coAuthorEmail, inviterName, projectTitle, loginUrl } = body;
		const normalizedEmail = normalizeAndValidateEmail(coAuthorEmail);

		if (!coAuthorName || !normalizedEmail) {
			return json({ error: 'Valid co-author name and email are required' }, { status: 400 });
		}

		const authenticatedInviterName =
			`${locals.user.firstName || ''} ${locals.user.lastName || ''}`.trim() ||
			locals.user.email ||
			inviterName ||
			'SciLedger user';

		await emailService.sendCoAuthorWelcomeEmail({
			coAuthorName,
			coAuthorEmail: normalizedEmail,
			inviterName: authenticatedInviterName,
			projectTitle,
			loginUrl
		});

		return json({ success: true });
	} catch (error) {
		console.error('Failed to send co-author email:', error);
		return new Response(JSON.stringify({ error: 'Failed to send email' }), {
			status: 500
		});
	}
};
