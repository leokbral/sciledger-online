// arquivo: src/routes/api/email/coauthor/+server.ts
import { json } from '@sveltejs/kit';
import { emailService } from '$lib/utils/CoAuthorEmailService';
import type { RequestHandler } from './$types';

function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const email = value.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (email.length > 254 || !emailRegex.test(email)) {
		return null;
	}

	return email;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();

		const { coAuthorName, coAuthorEmail, inviterName, projectTitle, loginUrl } = body;
		const normalizedEmail = normalizeEmail(coAuthorEmail);

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
