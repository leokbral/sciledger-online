// arquivo: src/routes/api/email/coauthor/+server.ts
import { json } from '@sveltejs/kit';
import { emailService } from '$lib/utils/CoAuthorEmailService';

export async function POST({ request }) {
    try {
        const body = await request.json();

        const { coAuthorName, coAuthorEmail, inviterName, projectTitle, loginUrl } = body;

        await emailService.sendCoAuthorWelcomeEmail({
            coAuthorName,
            coAuthorEmail,
            inviterName,
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
}
