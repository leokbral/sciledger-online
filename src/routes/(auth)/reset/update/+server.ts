import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { UserSchema } from '$lib/db/schemas/UserSchema.js';
import * as crypto from 'crypto';
import { AUTH_CONFIG_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export const POST: RequestHandler = async ({ request }) => {
    try {
        await start_mongo();
        
        const { token, newPassword } = await request.json();
        
        if (!token || !newPassword) {
            return json({ error: 'Token and new password are required' }, { status: 400 });
        }

        // Validar formato do token
        const tokenRegex = /^[a-f0-9]{64}$/;
        if (!tokenRegex.test(token)) {
            return json({ error: 'Invalid token format' }, { status: 400 });
        }

        // Validar senha
        if (newPassword.length < 6) {
            return json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
        }

        if (newPassword.length > 128) {
            return json({ error: 'Password must be less than 128 characters' }, { status: 400 });
        }

        // Verificar se a senha contém pelo menos uma letra e um número
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(newPassword)) {
            return json({ 
                error: 'Password must contain at least one letter and one number' 
            }, { status: 400 });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: new Date().toISOString() }
        });

        if (!user) {
            return json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        // Verificar se a nova senha é diferente da atual
        const salt = AUTH_CONFIG_SECRET;
        const newHashedPassword = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');
        
        if (user.password === newHashedPassword) {
            return json({ 
                error: 'New password must be different from your current password' 
            }, { status: 400 });
        }

        // Atualizar senha e limpar tokens de reset
        user.password = newHashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        user.refreshToken = undefined; // Invalidar sessões existentes
        user.updatedAt = new Date().toISOString();
        
        await user.save();

        console.log(`Password updated successfully for user: ${user.email}`);

        return json({ 
            message: 'Password updated successfully',
            user: {
                email: user.email,
                firstName: user.firstName
            }
        });

    } catch (error) {
        console.error('Error updating password:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
