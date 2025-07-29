import nodemailer from 'nodemailer';

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
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendCoAuthorWelcomeEmail(data: CoAuthorNotificationData): Promise<void> {
        const { coAuthorName, coAuthorEmail, inviterName, projectTitle, loginUrl } = data;

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0170f3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #0170f3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SciLedger!</h1>
          </div>
          <div class="content">
            <h2>Hello ${coAuthorName},</h2>
            <p>Great news! You have been added as a co-author on SciLedger platform by <strong>${inviterName}</strong>.</p>
            ${projectTitle ? `<p>You are now a collaborator on the project: <strong>${projectTitle}</strong></p>` : ''}
            <p>SciLedger is a collaborative platform designed for scientific research and publication management. As a co-author, you can:</p>
            <ul>
              <li>Collaborate on research projects</li>
              <li>Manage and edit scientific documents</li>
              <li>Track publication progress</li>
              <li>Communicate with your research team</li>
            </ul>
            <p>To get started, please log in to your account using the button below:</p>
            <a href="${loginUrl}" class="button">Access SciLedger</a>
            <p>If you're new to the platform, you can use your email address to log in and set up your profile.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The SciLedger Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
            subject: 'Welcome to SciLedger Online - You\'ve been added as a Co-Author',
            text: textContent,
            html: htmlContent,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Co-author welcome email sent to: ${coAuthorEmail}`);
        } catch (error) {
            console.error('Error sending co-author welcome email:', error);
            throw new Error('Failed to send welcome email');
        }
    }
}

export const emailService = new EmailService();