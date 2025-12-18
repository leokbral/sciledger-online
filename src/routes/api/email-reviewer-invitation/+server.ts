import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { HubSchema } from '$lib/db/schemas/HubSchema.js';
import * as crypto from 'crypto';
import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';
import { SITE_URL } from '$env/static/private';

// Clear the model cache to ensure we use the updated schema
if (mongoose.models.EmailReviewerInvitation) {
    delete mongoose.models.EmailReviewerInvitation;
}

const EmailReviewerInvitation = mongoose.model('EmailReviewerInvitation', EmailReviewerInvitationSchema);
const Hub = mongoose.models.Hub || mongoose.model('Hub', HubSchema);

// Configure transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'sciledger@imd.ufrn.br',
        pass: 'zfpzbhyzbozzqlvx'
    }
});

function generateInvitationEmailTemplate(
    email: string, 
    hubName: string,
    invitationUrl: string
): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reviewer Invitation - SciLedger</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background-color: #0170f3; color: white; padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: bold;">SciLedger</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Scientific Platform</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">📝 You've Been Invited to Join as a Reviewer</h2>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">You have been invited to join <strong>SciLedger</strong> as a reviewer for the following hub:</p>
                    
                    <!-- Hub Info Box -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #0170f3; padding: 20px; margin: 25px 0; border-radius: 4px;">
                        <p style="margin: 0;"><strong>🏛️ Hub:</strong> ${hubName}</p>
                    </div>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">To accept this invitation and create your reviewer account, please click the button below:</p>
                    
                    <!-- Button -->
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${invitationUrl}" style="display: inline-block; background-color: #0170f3; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(1, 112, 243, 0.3);">
                            ✅ Accept Invitation & Register
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
                    <div style="word-break: break-all; background-color: #f8f4ff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e0e0e0;">
                        ${invitationUrl}
                    </div>
                    
                    <!-- Warning Box -->
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                        <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Important</p>
                        <p style="color: #856404; margin: 5px 0 0 0;">This invitation link will expire in <strong>7 days</strong>.</p>
                    </div>
                    
                    <p style="font-size: 16px; margin-top: 30px;">We look forward to having you as part of our reviewer community!</p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">© ${new Date().getFullYear()} SciLedger. All rights reserved.</p>
                    <p style="font-size: 12px; color: #666; margin: 0;">This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

export const POST: RequestHandler = async ({ request }) => {
    console.log('📧 Starting email reviewer invitation process...');
    
    try {
        await start_mongo();
        
        const { email, hubId } = await request.json();
        console.log('📧 Data received:', { email, hubId });
        
        // Validate input
        if (!email || !hubId) {
            return json({ error: 'Email and hubId are required' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Get hub details
        const hub = await Hub.findById(hubId);

        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Check if there's already a pending invitation for this email and hub
        const existingInvitation = await EmailReviewerInvitation.findOne({
            email: email.toLowerCase(),
            hubId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (existingInvitation) {
            console.log('⚠️ Invitation already exists for this email and hub');
            return json({ error: 'An invitation has already been sent to this email for this hub' }, { status: 400 });
        }

        // Generate invitation token
        console.log('🔑 Generating invitation token...');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation record
        const invitation = new EmailReviewerInvitation({
            email: email.toLowerCase(),
            hubId,
            token,
            expiresAt,
            status: 'pending'
        });

        await invitation.save();
        console.log('✅ Invitation record created');

        // Invitation URL
        const invitationUrl = `${SITE_URL}/invite/register?token=${token}`;
        console.log(`🔗 Invitation URL: ${invitationUrl}`);

        // Send email
        console.log('📧 Sending invitation email...');
        await transporter.verify();
        
        const info = await transporter.sendMail({
            from: '"SciLedger Team" <sciledger@imd.ufrn.br>',
            to: email,
            subject: '📝 Invitation to Join as Reviewer - SciLedger',
            html: generateInvitationEmailTemplate(
                email,
                hub.name,
                invitationUrl
            )
        });

        console.log(`✅ Invitation email sent! Message ID: ${info.messageId}`);
        
        return json({ 
            message: 'Invitation sent successfully',
            email 
        });

    } catch (error) {
        console.error('❌ Error sending invitation:', error);
        return json({ 
            error: 'Failed to send invitation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};
