import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { Readable } from 'stream';
import type { RequestHandler } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { fsFiles } from '$lib/db/fs';

const bucket = new GridFSBucket(db);

export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*', // ou 'http://localhost:8000' se quiser restringir
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};

export const POST: RequestHandler = async ({ request }) => {
    console.log('POST request received for image upload');
    console.log('Received request to upload image');
    
    const buffer = await request.arrayBuffer();
    const fileName = request.headers.get("x-filename") || "image.jpg";
    const contentType = request.headers.get("x-content-type") || "image/jpeg";

    const customId = crypto.randomUUID();

    const fileHash = crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");

    const dbFile = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
    if (!dbFile) {
        const stream = Readable.from(Buffer.from(buffer));
        const uploadStream = bucket.openUploadStream(fileName, {
            contentType,
            metadata: {
                id: customId,
                fileHash,
                size: buffer.byteLength,
                type: 'image'
            }
        });

        await new Promise((resolve, reject) => {
            stream.pipe(uploadStream)
                .on('error', reject)
                .on('finish', resolve);
        });

        return new Response(JSON.stringify({ success: true, id: customId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true, id: dbFile.metadata.id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
