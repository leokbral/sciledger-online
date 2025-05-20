import type { RequestHandler } from '@sveltejs/kit';
import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';

const bucket = new GridFSBucket(db);

export const GET: RequestHandler = async ({ params }) => {
    try {
        const filesCursor = bucket.find({ 'metadata.id': params.id });
        const files = await filesCursor.toArray();

        if (!files.length) {
            return new Response('Image not found', { status: 404 });
        }

        const file = files[0];
        const downloadStream = bucket.openDownloadStream(file._id);

        // Collect the file data
        const chunks: Uint8Array[] = [];
        for await (const chunk of downloadStream) {
            chunks.push(chunk);
        }

        const fileData = Buffer.concat(chunks);

        return new Response(fileData, {
            headers: {
                'Content-Type': file.contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        return new Response('Error fetching image', { status: 500 });
    }
};
