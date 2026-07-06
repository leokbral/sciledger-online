import { env } from '$env/dynamic/private';
import {
	createEmailLayout,
	safeDetailValue,
	stripHtml,
	type EmailDetail,
	type EmailIcon,
	type EmailLayoutInput
} from '$lib/services/emailDesignSystem';
import type {
	EventEmailPayload,
	EventTemplateContext,
	PlatformEventType
} from '$lib/types/EventService';

type EventMetadata = Record<string, unknown>;

type EventEmailInput = {
	context: EventTemplateContext;
	title: string;
	message: string;
	ctaLabel?: string;
	ctaUrl?: string;
	details?: EmailDetail[];
};

const DEFAULT_SITE_URL = 'https://sciledger.online';

function platformUrl() {
	return String(env.SITE_URL || env.PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function absoluteUrl(pathOrUrl?: string) {
	const base = platformUrl();
	const value = String(pathOrUrl || '/notifications').trim();
	if (/^https?:\/\//i.test(value)) return value;
	return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

function formatDate(value: unknown) {
	const text = safeDetailValue(value);
	if (!text) return '';
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return text;
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

function formatAmount(data: EventMetadata) {
	const amount = Number(data.amount || 0);
	const currency = safeDetailValue(data.currency || 'BRL').toUpperCase();
	if (!amount) return '';
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency
		}).format(amount / 100);
	} catch {
		return `${currency} ${(amount / 100).toFixed(2)}`;
	}
}

function titleCase(value: unknown) {
	const text = safeDetailValue(value);
	if (!text) return '';
	return text
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (match) => match.toUpperCase());
}

function metadata(context: EventTemplateContext): EventMetadata {
	return context.event.metadata || {};
}

function eventCtaLabel(type: PlatformEventType) {
	if (type === 'paper.created') return 'Continue Draft';
	if (type === 'paper.rejected' || type === 'paper.accepted') return 'View Decision';
	if (
		type === 'paper.correction_requested' ||
		type === 'paper.corrections_submitted' ||
		type === 'paper.final_review_submitted' ||
		type === 'paper.correction_deadline.updated'
	) {
		return 'View Corrections';
	}
	if (type === 'paper.publication_requested') return 'Review Publication';
	if (type === 'paper.published') return 'View Publication';
	if (type.startsWith('paper.')) return 'View Paper';
	if (type.startsWith('review.invitation.')) return 'View Invitation';
	if (type === 'review.submitted') return 'View Review';
	if (type.startsWith('review.assignment.')) return 'Review Assignment';
	if (type.startsWith('review.deadline.')) return 'Open Review';
	if (type.startsWith('hub.invitation.')) return 'View Invitation';
	if (type.startsWith('hub.')) return 'Manage Hub';
	if (type.startsWith('role.')) return 'Manage Roles';
	if (type.startsWith('payment.') || type === 'reviewer.payout.paid') return 'View Payment Status';
	return 'Go to Dashboard';
}

function eventSubtitle(type: PlatformEventType) {
	if (type.startsWith('paper.')) return 'Paper workflow update';
	if (type.startsWith('review.invitation.')) return 'Review invitation update';
	if (type === 'review.submitted') return 'Peer review update';
	if (type.startsWith('review.assignment.')) return 'Review assignment update';
	if (type.startsWith('review.deadline.')) return 'Review deadline update';
	if (type.startsWith('hub.invitation.')) return 'Hub invitation update';
	if (type.startsWith('hub.')) return 'Hub workspace update';
	if (type.startsWith('role.')) return 'Role and access update';
	if (type.startsWith('payment.') || type === 'reviewer.payout.paid') return 'Payment update';
	return 'SciLedger platform update';
}

function eventIcon(type: PlatformEventType): EmailIcon {
	if (type.startsWith('review.invitation.')) {
		return { label: 'INV', title: 'Invitation', background: '#dbeafe', color: '#0b3d91' };
	}
	if (
		type === 'review.submitted' ||
		type.startsWith('review.assignment.') ||
		type.startsWith('review.deadline.')
	) {
		return { label: 'REV', title: 'Review', background: '#e0f2fe', color: '#075985' };
	}
	if (type.startsWith('hub.')) {
		return { label: 'HUB', title: 'Hub', background: '#dbeafe', color: '#1d4ed8' };
	}
	if (type.startsWith('role.')) {
		return { label: 'ROLE', title: 'Role', background: '#e2e8f0', color: '#334155' };
	}
	if (type.startsWith('payment.') || type === 'reviewer.payout.paid') {
		return { label: 'PAY', title: 'Payment', background: '#dcfce7', color: '#166534' };
	}
	return { label: 'DOC', title: 'Paper', background: '#dbeafe', color: '#0b3d91' };
}

function inferredDetails(context: EventTemplateContext): EmailDetail[] {
	const data = metadata(context);
	const amount = formatAmount(data);
	const type = context.event.type;
	const isPaymentEvent = type.startsWith('payment.') || type === 'reviewer.payout.paid';
	const isInvitationEvent =
		type.startsWith('review.invitation.') || type.startsWith('hub.invitation.');

	return [
		{ label: 'Paper title', value: data.paperTitle },
		{ label: 'Hub', value: data.hubName },
		{ label: 'Reviewer', value: data.reviewerName },
		{ label: 'Editor', value: data.editorName },
		{ label: 'Author', value: data.authorName || data.submittedByName },
		{
			label: 'Decision',
			value: titleCase(data.finalDecision || data.decision || data.reviewDecision)
		},
		{ label: 'Deadline', value: formatDate(data.deadline) },
		{ label: 'Previous deadline', value: formatDate(data.previousDeadline) },
		{ label: 'Invitation date', value: formatDate(data.invitedAt || data.createdAt) },
		{ label: 'Invitation status', value: isInvitationEvent ? titleCase(data.status) : undefined },
		{ label: 'Expiration date', value: formatDate(data.expiresAt) },
		{ label: 'Publication date', value: formatDate(data.publicationDate || data.publishedAt) },
		{ label: 'Role', value: data.roleName || titleCase(data.roleKey) },
		{
			label: 'Payment status',
			value: isPaymentEvent ? titleCase(data.paymentStatus || data.status) : undefined
		},
		{ label: 'Amount', value: amount },
		{
			label: 'Reason',
			value: data.rejectionReason || data.correctionReason || data.failureReason || data.reason
		}
	];
}

function eventCards(
	context: EventTemplateContext,
	details: EmailDetail[]
): Partial<EmailLayoutInput> {
	const data = metadata(context);
	const type = context.event.type;
	const isPaymentEvent = type.startsWith('payment.') || type === 'reviewer.payout.paid';
	const paymentAmount = formatAmount(data);
	const roleName = safeDetailValue(data.roleName || titleCase(data.roleKey));
	const paymentStatus = isPaymentEvent ? titleCase(data.paymentStatus || data.status) : '';
	const detailValue = (label: string) => details.find((detail) => detail.label === label)?.value;

	return {
		paper: safeDetailValue(data.paperTitle)
			? {
					title: data.paperTitle
				}
			: undefined,
		hub: safeDetailValue(data.hubName)
			? {
					name: data.hubName
				}
			: undefined,
		reviewer: safeDetailValue(data.reviewerName)
			? {
					name: data.reviewerName,
					email: data.reviewerEmail
				}
			: undefined,
		editor: safeDetailValue(data.editorName)
			? {
					name: data.editorName
				}
			: undefined,
		author: safeDetailValue(data.authorName || data.submittedByName)
			? {
					name: data.authorName || data.submittedByName
				}
			: undefined,
		role: roleName
			? {
					name: roleName
				}
			: undefined,
		payment:
			paymentStatus || paymentAmount
				? {
						status: paymentStatus,
						amount: paymentAmount || detailValue('Amount')
					}
				: undefined
	};
}

function plainText(title: string, message: string, details: EmailDetail[], siteUrl: string) {
	const detailLines = details
		.map(({ label, value }) => {
			const safeValue = safeDetailValue(value);
			return safeValue ? `${stripHtml(label)}: ${safeValue}` : '';
		})
		.filter(Boolean)
		.join('\n');

	return [
		'SciLedger',
		'',
		stripHtml(title),
		'',
		stripHtml(message),
		detailLines ? `\nSummary\n${detailLines}` : '',
		'',
		`Open SciLedger: ${siteUrl}`,
		'',
		'This is an automated message. Please do not reply.'
	]
		.filter((line) => line !== '')
		.join('\n');
}

function layoutDetails(details: EmailDetail[]) {
	const cardLabels = new Set([
		'Paper title',
		'Hub',
		'Reviewer',
		'Editor',
		'Author',
		'Role',
		'Payment status',
		'Amount'
	]);

	return details.filter((detail) => !cardLabels.has(detail.label));
}

export function buildInstitutionalEventEmail({
	context,
	title,
	message,
	ctaLabel,
	ctaUrl,
	details
}: EventEmailInput): EventEmailPayload {
	const siteUrl = platformUrl();
	const mergedDetails = details?.length ? details : inferredDetails(context);
	const finalCtaLabel = ctaLabel || eventCtaLabel(context.event.type);
	const actionHref = absoluteUrl(ctaUrl);
	const html = createEmailLayout({
		title,
		subtitle: eventSubtitle(context.event.type),
		message,
		actionLabel: finalCtaLabel,
		actionUrl: actionHref,
		siteUrl,
		showFooterLinks: true,
		details: layoutDetails(mergedDetails),
		icon: eventIcon(context.event.type),
		...eventCards(context, mergedDetails)
	});

	return {
		subject: stripHtml(title),
		text: plainText(title, message, mergedDetails, siteUrl),
		html
	};
}
