import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

const client = new MongoClient(MONGODB_URI);

export async function startMongo() {
    try {
        await client.connect();
        return client.db('myapp');
    } catch (error) {
        console.error('Database connection failed', error);
        throw error;
    }
}

export default client;