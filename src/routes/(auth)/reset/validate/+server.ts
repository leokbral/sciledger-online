import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { UserSchema } from '$lib/db/schemas/UserSchema.js';
import type { RequestHandler } from './$types';

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export const POST: RequestHandler = async ({ request }) => {
    try {
        await start_mongo();
        
        const { token } = await request.json();
        
        if (!token) {
            return json({ error: 'Token is required' }, { status: 400 });
        }

        // Verificar se o token é válido (formato hexadecimal de 64 caracteres)
        const tokenRegex = /^[a-f0-9]{64}$/;
        if (!tokenRegex.test(token)) {
            return json({ error: 'Invalid token format' }, { status: 400 });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: new Date().toISOString() }
        });

        if (!user) {
            return json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        // Verificar se o token não está muito próximo da expiração (menos de 5 minutos)
        const expiryTime = new Date(user.resetPasswordExpiry).getTime();
        const currentTime = new Date().getTime();
        const timeUntilExpiry = expiryTime - currentTime;
        
        if (timeUntilExpiry < 300000) { // 5 minutos
            return json({ 
                error: 'Token is about to expire. Please request a new password reset.',
                expiringSoon: true 
            }, { status: 400 });
        }

        return json({ 
            valid: true,
            user: {
                email: user.email,
                firstName: user.firstName
            }
        });

    } catch (error) {
        console.error('Error validating token:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};