import {MongoClient} from 'mongodb';
import { config } from 'dotenv';
config();
const MONGO_URL = process.env.MONGO_URL;


const client = new MongoClient(MONGO_URL)

console.log(MONGO_URL)

export function start_mongo() {
	console.log('Starting mongo...');
	console.log('Chama l13')
	return client.connect();
}

export const db = client.db();