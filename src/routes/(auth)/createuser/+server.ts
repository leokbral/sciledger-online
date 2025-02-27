import { json, type RequestHandler } from '@sveltejs/kit';
import mongoose from 'mongoose';
import User from '$lib/db/models/User';
//import bcrypt from 'bcryptjs'; // Para criptografar a senha
import * as crypto from 'crypto';

import { config } from 'dotenv';
config();

const MONGO_URL = process.env.MONGO_URL;
const AUTH_CONFIG_SECRET = process.env.MONGO_URL;

// Conectar ao MongoDB
try {
    await mongoose.connect(MONGO_URL, {
        // Configurações padrão são usadas
    });
} catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();

        // Validação do handle: deve ser único, sem espaços e começar com "@"
        const handlePattern = /^@[A-Za-z0-9_]{3,}$/;
        if (!handlePattern.test(data.handle)) {
            return json({ error: 'Handle inválido. Não conter espaços.' }, { status: 400 });
        }

        // Verificar se o email ou handle já estão em uso
        const emailExists = await User.findOne({ email: data.email });
        const handleExists = await User.findOne({ handle: data.handle });

        if (emailExists) {
            return json({ error: 'Email já está em uso.' }, { status: 400 });
        }

        if (handleExists) {
            return json({ error: 'Handle já está em uso.' }, { status: 400 });
        }

        // Criptografar a senha antes de salvar
        const salt = AUTH_CONFIG_SECRET
        const hashedPassword = await crypto.pbkdf2Sync(data.password, salt, 1000, 64, 'sha512').toString('hex');

        // Criar o novo usuário com os campos essenciais
        const newUser = new User({
            name: data.name,
            handle: data.handle,
            email: data.email,
            password: hashedPassword,
        });

        const savedUser = await newUser.save();
        return json(savedUser, { status: 201 });
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        return json({ error: 'Erro ao criar usuário.' }, { status: 500 });
    }
};
