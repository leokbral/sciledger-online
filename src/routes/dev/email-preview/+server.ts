import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { PaperLifecycleEmailService } from '$lib/services/PaperLifecycleEmailService';

export const GET: RequestHandler = async ({ url }) => {
	if (env.NODE_ENV === 'production') {
		return new Response('Not found', { status: 404 });
	}

	const paperTitle = url.searchParams.get('title') || 'A Multi-Phase Approach to Transparent Peer Review';
	const recipientName = url.searchParams.get('name') || 'Dr. Jane Doe';
	const paperId = url.searchParams.get('paperId') || 'preview-paper-id';
	const submittedByName = url.searchParams.get('submittedBy') || 'Dr. John Smith';
	const acceptedByName = url.searchParams.get('acceptedBy') || 'Editorial Board';

	const submissionEmail = PaperLifecycleEmailService.buildSubmissionEmailPayload({
		recipientName,
		paperId,
		paperTitle,
		submittedByName
	});

	const acceptedReviewEmail = PaperLifecycleEmailService.buildAcceptedEmailPayload({
		recipientName,
		paperId,
		paperTitle,
		acceptedByName,
		acceptanceType: 'review'
	});

	const acceptedPublicationEmail = PaperLifecycleEmailService.buildAcceptedEmailPayload({
		recipientName,
		paperId,
		paperTitle,
		acceptedByName,
		acceptanceType: 'publication'
	});

	const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>SciLedger Email Preview</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f4f7fb; color: #1f2937; }
		h1 { margin-top: 0; }
		.card { background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
		.meta { font-size: 14px; color: #475569; margin-bottom: 8px; }
		.subject { font-weight: bold; margin: 8px 0 16px 0; }
		.preview { border: 1px dashed #cbd5e1; padding: 12px; border-radius: 8px; background: #fcfdff; }
	</style>
</head>
<body>
	<h1>SciLedger Email Preview</h1>
	<p class="meta">Use query params to customize preview: <code>?title=...&name=...&submittedBy=...&acceptedBy=...</code></p>

	<div class="card">
		<h2>1) Submission Confirmation</h2>
		<div class="subject">Subject: ${submissionEmail.subject}</div>
		<div class="preview">${submissionEmail.html}</div>
	</div>

	<div class="card">
		<h2>2) Acceptance for Review</h2>
		<div class="subject">Subject: ${acceptedReviewEmail.subject}</div>
		<div class="preview">${acceptedReviewEmail.html}</div>
	</div>

	<div class="card">
		<h2>3) Approval for Publication</h2>
		<div class="subject">Subject: ${acceptedPublicationEmail.subject}</div>
		<div class="preview">${acceptedPublicationEmail.html}</div>
	</div>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8'
		}
	});
};
