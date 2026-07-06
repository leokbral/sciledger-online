import { createEmailLayout, type EmailInformationCardInput } from './emailDesignSystem';

export function buildReviewerInvitationEmailHtml(data: {
	hubName: string;
	invitationUrl: string;
	declineUrl: string;
	paperTitle?: string | null;
	paperAbstract?: string | null;
}) {
	return createEmailLayout({
		title: "You've Been Invited to Join as a Reviewer",
		subtitle: 'Reviewer invitation',
		greeting: 'Hello,',
		message: 'You have been invited to join SciLedger as a reviewer for the following hub:',
		hub: { name: data.hubName },
		paper:
			data.paperTitle || data.paperAbstract
				? {
						title: data.paperTitle || 'Untitled',
						abstract: data.paperAbstract || undefined
					}
				: undefined,
		ctaIntro:
			'To accept this invitation and create your reviewer account, please click the button below:',
		actionLabel: 'Accept Invitation & Register',
		actionUrl: data.invitationUrl,
		secondaryActionIntro:
			'If you are unable to review, you can decline and inform the hub manager:',
		secondaryActionLabel: 'Decline Invitation',
		secondaryActionUrl: data.declineUrl,
		fallbackUrl: data.invitationUrl,
		warning: {
			title: 'Important',
			message: 'This invitation link will expire in 7 days.'
		},
		closing: 'We look forward to having you as part of our reviewer community!'
	});
}

export function buildPasswordResetEmailHtml(firstName: string, resetUrl: string) {
	return createEmailLayout({
		title: 'Reset Your Password',
		subtitle: 'Account security',
		greeting: `Hello ${firstName},`,
		message:
			"We received a request to reset your SciLedger account password. If you didn't make this request, you can safely ignore this email.",
		actionLabel: 'Reset Password',
		actionUrl: resetUrl,
		fallbackUrl: resetUrl,
		warning: {
			title: 'Important',
			message: 'This link will expire in 1 hour for security reasons.'
		},
		closing: 'If you continue having problems, please contact our support team.'
	});
}

export function buildCoAuthorWelcomeEmailHtml(data: {
	coAuthorName: string;
	inviterName: string;
	projectTitle?: string;
	loginUrl: string;
}) {
	const information: EmailInformationCardInput[] = [];

	if (data.projectTitle) {
		information.push({
			fields: [{ label: 'Project', value: data.projectTitle }]
		});
	}

	information.push({
		title: 'As a co-author, you can:',
		items: [
			'Collaborate on research projects',
			'Manage and edit scientific documents',
			'Track publication progress',
			'Communicate with your research team'
		]
	});

	return createEmailLayout({
		title: 'Welcome to SciLedger!',
		subtitle: 'Co-author access',
		greeting: `Hello ${data.coAuthorName},`,
		message: [
			`Great news! You have been added as a co-author on SciLedger platform by ${data.inviterName}.`,
			'SciLedger is a collaborative platform designed for scientific research and publication management.'
		],
		information,
		ctaIntro: 'To get started, please log in to your account using the button below:',
		actionLabel: 'Access SciLedger',
		actionUrl: data.loginUrl,
		fallbackUrl: data.loginUrl,
		closing:
			"If you're new to the platform, you can use your email address to log in and set up your profile. If you have any questions or need assistance, please don't hesitate to contact our support team."
	});
}
