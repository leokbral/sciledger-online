import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { UserSchema } from '$lib/db/schemas/UserSchema.js';
import * as crypto from 'crypto';
import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';
import { SITE_URL } from '$env/static/private';

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Configure transporter exactly like in test-email.js
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'sciledger@imd.ufrn.br',
        pass: 'zfpzbhyzbozzqlvx' // App Password
    },
    debug: true,
    logger: true
});

function generatePasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reset Password - SciLedger</title>
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
                    <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">🔐 Reset Your Password</h2>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${firstName}</strong>,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">We received a request to reset your SciLedger account password. If you didn't make this request, you can safely ignore this email.</p>
                    
                    <!-- Button -->
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background-color: #0170f3; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(126, 12, 245, 0.3);">
                            🔑 Reset Password
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
                    <div style="word-break: break-all; background-color: #f8f4ff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e0e0e0;">
                        ${resetUrl}
                    </div>
                    
                    <!-- Warning Box -->
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                        <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Important</p>
                        <p style="color: #856404; margin: 5px 0 0 0;">This link will expire in <strong>1 hour</strong> for security reasons.</p>
                    </div>
                    
                    <p style="font-size: 16px; margin-top: 30px;">If you continue having problems, please contact our support team.</p>
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
    console.log('🔐 Starting password recovery process...');
    
    try {
        await start_mongo();
        
        const { email } = await request.json();
        console.log('📧 Email received:', email);
        
        if (!email) {
            console.log('❌ Email not provided');
            return json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Invalid email format:', email);
            return json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Find user by email
        console.log('🔍 Looking for user in database...');
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            console.log(`⚠️ User not found for email: ${email}`);
            // For security, always return success even if email doesn't exist
            return json({ message: 'success' });
        }

        console.log(`✅ User found: ${user.firstName} (${user.email})`);

        // Check if there's already a valid token (not expired)
        if (user.resetPasswordToken && user.resetPasswordExpiry) {
            const now = new Date();
            const expiry = new Date(user.resetPasswordExpiry);
            
            if (expiry > now) {
                console.log(`⏰ Reset token still valid for: ${email}`);
                return json({ message: 'success' });
            }
        }

        // Generate new recovery token
        console.log('🔑 Generating new recovery token...');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Save token to user
        console.log('💾 Saving token to database...');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = resetTokenExpiry.toISOString();
        user.updatedAt = new Date().toISOString();
        await user.save();

        // Reset URL
        const resetUrl = `${SITE_URL}/reset?token=${resetToken}`;
        console.log(`🔗 Reset URL generated: ${resetUrl}`);

        // Verify transporter connection (same as test-email.js)
        console.log('🔌 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection OK');

        console.log('📧 Sending recovery email...');
        const info = await transporter.sendMail({
            from: '"SciLedger Team" <sciledger@imd.ufrn.br>',
            to: user.email,
            subject: '🔐 Reset Password - SciLedger',
            html: generatePasswordResetEmailTemplate(user.firstName, resetUrl)
        });

        console.log(`✅ Recovery email sent! Message ID: ${info.messageId}`);
        console.log(`📧 Email sent to: ${user.email}`);
        
        return json({ message: 'success' });

    } catch (error) {
        console.error('❌ Error in password recovery:', error);
        
        // Detailed error logging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        
        return json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};