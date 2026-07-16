import nodemailer from 'nodemailer';
import { buildCoAuthorWelcomeEmailHtml } from '$lib/services/platformEmailTemplates';

interface CoAuthorNotificationData {
	coAuthorName: string;
	coAuthorEmail: string;
	inviterName: string;
	projectTitle?: string;
	loginUrl: string;
}

class EmailService {
	private transporter: nodemailer.Transporter;

	constructor() {
		this.transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST || 'smtp.gmail.com',
			port: parseInt(process.env.SMTP_PORT || '587'),
			secure: false,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
			}
		});
	}

	async sendCoAuthorWelcomeEmail(data: CoAuthorNotificationData): Promise<void> {
		const { coAuthorName, coAuthorEmail, inviterName, projectTitle, loginUrl } = data;

		const htmlContent = buildCoAuthorWelcomeEmailHtml({
			coAuthorName,
			inviterName,
			projectTitle,
			loginUrl
		});

		const textContent = `
      Welcome to SciLedger !

      Hello ${coAuthorName},

      Great news! You have been added as a co-author on SciLedger platform by ${inviterName}.

      ${projectTitle ? `You are now a collaborator on the project: ${projectTitle}` : ''}

      SciLedger is a collaborative platform designed for scientific research and publication management. As a co-author, you can:
      - Collaborate on research projects
      - Manage and edit scientific documents
      - Track publication progress
      - Communicate with your research team

      To get started, please visit: ${loginUrl}

      If you're new to the platform, you can use your email address to log in and set up your profile.

      If you have any questions or need assistance, please don't hesitate to contact our support team.

      Best regards,
      The SciLedger Online Team

      This is an automated message. Please do not reply to this email.
    `;

		const mailOptions = {
			from: `"SciLedger Online" <${process.env.SMTP_USER}>`,
			to: coAuthorEmail,
			subject: "Welcome to SciLedger Online - You've been added as a Co-Author",
			text: textContent,
			html: htmlContent
		};

		try {
			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending co-author welcome email:', error);
			throw new Error('Failed to send welcome email');
		}
	}
}

export const emailService = new EmailService();
