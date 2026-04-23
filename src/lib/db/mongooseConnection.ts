import { config } from 'dotenv';
config();
const MONGO_URL = process.env.MONGO_URL ||'';

if (!MONGO_URL) {
    throw new Error('MONGO_URL environment variable is not defined');
}

import mongoose from 'mongoose';
import './models/Hub';
import './models/Draft';

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function start_mongo() {
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(MONGO_URL, {})
            .then((connection) => {
                console.log('Connected to MongoDB via Mongoose');
                return connection;
            })
            .catch((error) => {
                connectionPromise = null;
                console.error('Error connecting to MongoDB:', error);
                throw error;
            });
    }

    await connectionPromise;
    return mongoose;
}
