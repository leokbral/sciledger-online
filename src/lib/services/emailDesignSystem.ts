export type EmailIcon = {
	label: string;
	title: string;
	background?: string;
	color?: string;
};

export type EmailDetail = {
	label: string;
	value?: unknown;
};

export type EmailAction = {
	label: string;
	url: string;
	intro?: string;
};

export type EmailNotice = {
	title?: string;
	message: string;
};

export type EmailInformationCardInput = {
	title?: string;
	message?: string;
	fields?: EmailDetail[];
	items?: string[];
};

export type EmailPaperCardInput = {
	title?: unknown;
	abstract?: unknown;
	status?: unknown;
};

export type EmailHubCardInput = {
	name?: unknown;
};

export type EmailPersonCardInput = {
	name?: unknown;
	email?: unknown;
};

export type EmailRoleCardInput = {
	name?: unknown;
	status?: unknown;
};

export type EmailPaymentCardInput = {
	status?: unknown;
	amount?: unknown;
};

export type EmailLayoutInput = {
	title: string;
	subtitle?: string;
	preheader?: string;
	message?: string | string[];
	body?: string | string[];
	greeting?: string;
	closing?: string;
	icon?: EmailIcon;
	siteUrl?: string;
	showLogo?: boolean;
	showHero?: boolean;
	showFooter?: boolean;
	showFooterLinks?: boolean;
	paper?: EmailPaperCardInput;
	hub?: EmailHubCardInput;
	reviewer?: EmailPersonCardInput;
	editor?: EmailPersonCardInput;
	author?: EmailPersonCardInput;
	role?: EmailRoleCardInput;
	payment?: EmailPaymentCardInput;
	information?: EmailInformationCardInput | EmailInformationCardInput[];
	details?: EmailDetail[];
	warning?: EmailNotice | string;
	success?: EmailNotice | string;
	expirationNotice?: EmailNotice | string;
	actionLabel?: string;
	actionUrl?: string;
	secondaryActionLabel?: string;
	secondaryActionUrl?: string;
	secondaryActionIntro?: string;
	ctaIntro?: string;
	fallbackUrl?: string;
	footer?: string;
};

const DEFAULT_SITE_URL = 'https://sciledger.online';
const DEFAULT_FOOTER = 'This is an automated message. Please do not reply.';

function stripTags(value: unknown, preserveBreaks = false) {
	const normalized = String(value ?? '')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<\s*(br|\/p|\/div|\/li)[^>]*>/gi, preserveBreaks ? '\n' : ' ')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/\r\n|\r/g, '\n');

	if (!preserveBreaks) {
		return normalized.replace(/\s+/g, ' ').trim();
	}

	return normalized
		.split('\n')
		.map((line) => line.replace(/[ \t]+/g, ' ').trim())
		.filter(Boolean)
		.join('\n')
		.trim();
}

function redactInternalIds(value: string) {
	return value
		.replace(/\b[a-f0-9]{24}\b/gi, '')
		.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '')
		.replace(/[ \t]+/g, ' ')
		.trim();
}

export function stripHtml(value: unknown, options?: { preserveBreaks?: boolean }) {
	return redactInternalIds(stripTags(value, options?.preserveBreaks));
}

export function isInternalId(value: string) {
	const trimmed = value.trim();
	return (
		/^[a-f0-9]{24}$/i.test(trimmed) ||
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
	);
}

export function safeDetailValue(value: unknown, options?: { preserveBreaks?: boolean }) {
	const text = stripHtml(value, options);
	if (!text || text === 'null' || text === 'undefined' || isInternalId(text)) return '';
	return text;
}

export function escapeHtml(value: unknown, options?: { preserveBreaks?: boolean }) {
	return safeDetailValue(value, options)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function escapeAttribute(value: unknown) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function resolveSiteUrl(siteUrl?: string, actionUrl?: string) {
	const configuredSiteUrl = String(siteUrl || '').trim();
	if (configuredSiteUrl) return configuredSiteUrl.replace(/\/+$/, '');

	const action = String(actionUrl || '').trim();
	if (/^https?:\/\//i.test(action)) {
		try {
			return new URL(action).origin;
		} catch {
			return DEFAULT_SITE_URL;
		}
	}

	return DEFAULT_SITE_URL;
}

function normalizeParagraphs(value?: string | string[]) {
	const values = Array.isArray(value) ? value : value ? [value] : [];
	return values.map((item) => safeDetailValue(item)).filter(Boolean);
}

function toNotice(value?: EmailNotice | string): EmailNotice | null {
	if (!value) return null;
	if (typeof value === 'string') return { message: value };
	return value;
}

function renderParagraph(text: string) {
	return `<p style="font-size: 15px; margin: 0 0 14px 0; color: #334155; line-height: 1.6;">${escapeHtml(text)}</p>`;
}

function renderFields(fields: EmailDetail[] = []) {
	return fields
		.map(({ label, value }) => {
			const safeValue = safeDetailValue(value);
			if (!safeValue) return '';
			return `<p style="margin: 0 0 8px 0; color: #0b3d91; font-weight: 600; font-size: 15px; line-height: 1.5;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(safeValue)}</p>`;
		})
		.join('');
}

function renderList(items: string[] = []) {
	const rows = items
		.map((item) => safeDetailValue(item))
		.filter(Boolean)
		.map(
			(item) =>
				`<li style="margin: 0 0 6px 0; color: #334155; font-size: 15px; line-height: 1.5;">${escapeHtml(item)}</li>`
		)
		.join('');

	if (!rows) return '';
	return `<ul style="margin: 8px 0 0 18px; padding: 0;">${rows}</ul>`;
}

export function EmailHeader(options: { showLogo?: boolean } = {}) {
	if (options.showLogo === false) return '';

	return `
				<div style="background-color: #07326a; color: #ffffff; padding: 28px 20px; text-align: center;">
					<h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">SciLedger</h1>
					<p style="margin: 8px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.95); opacity: 0.95;">Scientific Platform</p>
				</div>
	`;
}

export function EmailHero({
	title,
	subtitle,
	icon
}: {
	title: string;
	subtitle?: string;
	icon?: EmailIcon;
}) {
	const safeTitle = escapeHtml(title);
	const safeSubtitle = escapeHtml(subtitle || '');

	if (!icon) {
		return `
					<h2 style="color: #0f1724; margin: 0 0 14px 0; font-size: 20px; font-weight: 600; line-height: 1.3;">${safeTitle}</h2>
		`;
	}

	return `
					<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; margin: 0 0 18px 0;">
						<tr>
							<td valign="top" style="width: 58px; padding-right: 14px;">
								<div title="${escapeAttribute(icon.title)}" style="width: 48px; height: 48px; border-radius: 12px; background-color: ${escapeAttribute(icon.background || '#dbeafe')}; color: ${escapeAttribute(icon.color || '#0b3d91')}; font-family: Arial, sans-serif; font-size: 12px; line-height: 48px; font-weight: 800; text-align: center; letter-spacing: 0.03em;">${escapeHtml(icon.label)}</div>
							</td>
							<td valign="top">
								${safeSubtitle ? `<div style="color: #0b63d6; font-size: 12px; line-height: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">${safeSubtitle}</div>` : ''}
								<h2 style="color: #0f1724; margin: 0; font-size: 20px; font-weight: 600; line-height: 1.3;">${safeTitle}</h2>
							</td>
						</tr>
					</table>
	`;
}

export function EmailSection(content: string) {
	if (!content.trim()) return '';
	return `<div style="margin: 20px 0;">${content}</div>`;
}

export function EmailPaperCard(input?: EmailPaperCardInput) {
	const title = safeDetailValue(input?.title) || '';
	const abstract = safeDetailValue(input?.abstract, { preserveBreaks: true });
	const status = safeDetailValue(input?.status);
	if (!title && !abstract && !status) return '';

	return `
					<div style="background-color: #ffffff; border: 1px solid #e6eefc; padding: 22px; margin: 22px 0; border-radius: 8px;">
						<h3 style="margin: 0 0 10px 0; font-size: 18px; color: #0b3d91; line-height: 1.35;">Paper: ${escapeHtml(title || 'Untitled')}</h3>
						${status ? `<p style="margin: 0 0 8px 0; color: #334155; font-size: 14px; line-height: 1.5;"><strong>Status:</strong> ${escapeHtml(status)}</p>` : ''}
						${abstract ? `<div style="margin-top: 8px; color: #374151; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(abstract, { preserveBreaks: true })}</div>` : ''}
					</div>
	`;
}

export function EmailHubCard(input?: EmailHubCardInput) {
	const name = safeDetailValue(input?.name);
	if (!name) return '';
	return EmailInformationCard({
		fields: [{ label: 'Hub', value: name }]
	});
}

export function EmailReviewerCard(input?: EmailPersonCardInput) {
	const fields = [
		{ label: 'Reviewer', value: input?.name },
		{ label: 'Email', value: input?.email }
	];
	return EmailInformationCard({ fields });
}

export function EmailEditorCard(input?: EmailPersonCardInput) {
	const fields = [
		{ label: 'Editor', value: input?.name },
		{ label: 'Email', value: input?.email }
	];
	return EmailInformationCard({ fields });
}

export function EmailAuthorCard(input?: EmailPersonCardInput) {
	const fields = [
		{ label: 'Author', value: input?.name },
		{ label: 'Email', value: input?.email }
	];
	return EmailInformationCard({ fields });
}

export function EmailRoleCard(input?: EmailRoleCardInput) {
	const fields = [
		{ label: 'Role', value: input?.name },
		{ label: 'Status', value: input?.status }
	];
	return EmailInformationCard({ fields });
}

export function EmailPaymentCard(input?: EmailPaymentCardInput) {
	const fields = [
		{ label: 'Payment status', value: input?.status },
		{ label: 'Amount', value: input?.amount }
	];
	return EmailInformationCard({ fields });
}

export function EmailInformationCard(input?: EmailInformationCardInput) {
	const title = safeDetailValue(input?.title);
	const message = safeDetailValue(input?.message);
	const fields = renderFields(input?.fields || []);
	const items = renderList(input?.items || []);

	if (!title && !message && !fields.trim() && !items.trim()) return '';

	return `
					<div style="background-color: #f4f8ff; border-left: 4px solid #0b63d6; padding: 16px; margin: 20px 0; border-radius: 6px;">
						${title ? `<p style="margin: 0 0 8px 0; color: #0b3d91; font-weight: 700; font-size: 15px; line-height: 1.5;">${escapeHtml(title)}</p>` : ''}
						${message ? `<p style="margin: 0 0 8px 0; color: #334155; font-size: 15px; line-height: 1.5;">${escapeHtml(message)}</p>` : ''}
						${fields}
						${items}
					</div>
	`;
}

export function EmailWarningCard(input?: EmailNotice | string) {
	const notice = toNotice(input);
	if (!notice) return '';

	const title = safeDetailValue(notice.title || 'Important');
	const message = safeDetailValue(notice.message);
	if (!message) return '';

	return `
					<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
						<p style="color: #856404; margin: 0; font-weight: bold;">${escapeHtml(title)}</p>
						<p style="color: #856404; margin: 5px 0 0 0;">${escapeHtml(message)}</p>
					</div>
	`;
}

export function EmailSuccessCard(input?: EmailNotice | string) {
	const notice = toNotice(input);
	if (!notice) return '';

	const title = safeDetailValue(notice.title || 'Success');
	const message = safeDetailValue(notice.message);
	if (!message) return '';

	return `
					<div style="background-color: #ecfdf5; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 4px;">
						<p style="color: #166534; margin: 0; font-weight: bold;">${escapeHtml(title)}</p>
						<p style="color: #166534; margin: 5px 0 0 0;">${escapeHtml(message)}</p>
					</div>
	`;
}

export function EmailCTA(action?: EmailAction) {
	const label = safeDetailValue(action?.label);
	const url = String(action?.url || '').trim();
	if (!label || !url) return '';

	return `
					<div style="text-align: center; margin: 36px 0;">
						<a href="${escapeAttribute(url)}" style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
							${escapeHtml(label)}
						</a>
					</div>
	`;
}

export function EmailSecondaryCTA(action?: EmailAction) {
	const label = safeDetailValue(action?.label);
	const url = String(action?.url || '').trim();
	if (!label || !url) return '';

	return `
					<div style="text-align: center; margin: 0 0 30px 0;">
						<a href="${escapeAttribute(url)}" style="display: inline-block; background-color: #f3f4f6; color: #111827; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #d1d5db;">
							${escapeHtml(label)}
						</a>
					</div>
	`;
}

export function EmailFallbackLink(url?: string) {
	const href = String(url || '').trim();
	if (!href) return '';

	return `
					<p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Or copy and paste this link into your browser:</p>
					<div style="word-break: break-all; background-color: #f8f4ff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e0e0e0;">
						${escapeHtml(href)}
					</div>
	`;
}

export function EmailExpirationNotice(input?: EmailNotice | string) {
	return EmailWarningCard(input);
}

export function EmailFooter({
	footer = DEFAULT_FOOTER,
	siteUrl = DEFAULT_SITE_URL,
	showLinks = true
}: {
	footer?: string;
	siteUrl?: string;
	showLinks?: boolean;
}) {
	const year = new Date().getFullYear();
	const notificationsUrl = `${siteUrl.replace(/\/+$/, '')}/notifications`;

	return `
				<div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
					<p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">&copy; ${year} SciLedger. All rights reserved.</p>
					<p style="font-size: 12px; color: #666; margin: 0;">${escapeHtml(footer)}</p>
					${
						showLinks
							? `<p style="font-size: 12px; color: #666; margin: 10px 0 0 0;"><a href="${escapeAttribute(siteUrl)}" style="color: #0066cc; text-decoration: underline;">Open SciLedger</a><span style="color: #999;"> | </span><a href="${escapeAttribute(notificationsUrl)}" style="color: #0066cc; text-decoration: underline;">Notifications</a></p>`
							: ''
					}
				</div>
	`;
}

export function EmailLayout(input: EmailLayoutInput) {
	const actionUrl = String(input.actionUrl || '').trim();
	const siteUrl = resolveSiteUrl(input.siteUrl, actionUrl);
	const title = safeDetailValue(input.title) || 'SciLedger';
	const preheader =
		safeDetailValue(input.preheader) ||
		normalizeParagraphs(input.message || input.body || input.greeting)[0] ||
		title;
	const message = normalizeParagraphs(input.message || input.body);
	const informationCards = Array.isArray(input.information)
		? input.information
		: input.information
			? [input.information]
			: [];

	const detailsCard =
		input.details && input.details.length
			? EmailInformationCard({ title: 'Additional information', fields: input.details })
			: '';

	const content = [
		input.showHero === false
			? ''
			: EmailHero({ title, subtitle: input.subtitle, icon: input.icon }),
		input.greeting ? renderParagraph(input.greeting) : '',
		...message.map(renderParagraph),
		EmailHubCard(input.hub),
		EmailPaperCard(input.paper),
		EmailReviewerCard(input.reviewer),
		EmailEditorCard(input.editor),
		EmailAuthorCard(input.author),
		EmailRoleCard(input.role),
		EmailPaymentCard(input.payment),
		...informationCards.map(EmailInformationCard),
		detailsCard,
		EmailSuccessCard(input.success),
		input.ctaIntro ? renderParagraph(input.ctaIntro) : '',
		EmailCTA(
			actionUrl ? { label: input.actionLabel || 'Open SciLedger', url: actionUrl } : undefined
		),
		input.secondaryActionIntro ? renderParagraph(input.secondaryActionIntro) : '',
		EmailSecondaryCTA(
			input.secondaryActionUrl
				? { label: input.secondaryActionLabel || 'Open', url: input.secondaryActionUrl }
				: undefined
		),
		EmailFallbackLink(input.fallbackUrl),
		EmailWarningCard(input.warning),
		EmailExpirationNotice(input.expirationNotice),
		input.closing
			? `<p style="font-size: 16px; margin: 30px 0 0 0; color: #334155; line-height: 1.6;">${escapeHtml(input.closing)}</p>`
			: ''
	]
		.filter((section) => section.trim())
		.join('\n');

	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${escapeHtml(title)} - SciLedger</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
            <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; font-size: 1px; line-height: 1px;">${escapeHtml(preheader)}</div>
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
				${EmailHeader({ showLogo: input.showLogo })}

                <div style="padding: 40px 30px;">
					${content}
                </div>

                ${input.showFooter === false ? '' : EmailFooter({ footer: input.footer, siteUrl, showLinks: input.showFooterLinks })}
            </div>
        </body>
        </html>
    `;
}

export const createEmailLayout = EmailLayout;
