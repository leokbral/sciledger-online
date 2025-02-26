import { startMongo } from '$lib/db';

export async function load() {
    const db = await startMongo();
    const collection = db.collection('test');
    const items = await collection.find({}).toArray();
    
    // Convert ObjectId to string and ensure serializable data
    const serializedItems = items.map(item => ({
        ...item,
        _id: item._id.toString(),
    }));

    return { items: serializedItems };
}