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
    if (mongoose.connection.readyState === 0) { // Check if a connection already exists
        try {
            mongoose.connect(MONGO_URL, {});
            console.log('Connected to MongoDB via Mongoose');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error; // Throw the error to be handled elsewhere
        }
    }
}
