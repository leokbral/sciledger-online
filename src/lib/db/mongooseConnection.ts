import { config } from 'dotenv';
config();
const MONGO_URL = process.env.MONGO_URL ||'';

if (!MONGO_URL) {
    throw new Error('MONGO_URL environment variable is not defined');
}

import mongoose from 'mongoose';
import './models/Hub';
import './models/Draft';

export async function start_mongo() {
    if (mongoose.connection.readyState === 0) { // Verifica se já existe uma conexão ativa
        try {
            mongoose.connect(MONGO_URL, {});
            console.log('Conectado ao MongoDB via Mongoose');
        } catch (error) {
            console.error('Erro ao conectar ao MongoDB:', error);
            throw error; // Lança o erro para ser tratado em outros lugares
        }
    }
}
