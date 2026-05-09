import {MongoClient} from 'mongodb';
import { config } from 'dotenv';
config();
const MONGO_URL = process.env.MONGO_URL;


const client = new MongoClient(MONGO_URL as string)

export function start_mongo() {
	return client.connect();
}

export const db = client.db();