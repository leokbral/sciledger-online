import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { Readable } from 'stream';
import type { RequestHandler } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { fsFiles } from '$lib/db/fs';

const bucket = new GridFSBucket(db);

async function saveImage(file: File) {
    console.log('Saving image:', file.name, file.size, file.type, file.lastModified);
    const fileHash = await getUniqueFileHash(file);
    const customId = crypto.randomUUID();
    
    // Check if image already exists
    const dbFile = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
    console.log(dbFile,fileHash)
    
    if (!dbFile) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // Save image to MongoDB using GridFS
        const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
            metadata: {
                id: customId,
                fileHash,
                lastModified: file.lastModified,
                size: file.size,
                type: 'image' // Add type to distinguish from PDFs
            },
        });

        await new Promise((resolve, reject) => {
            stream.pipe(uploadStream)
                .on('error', reject)
                .on('finish', resolve);
        });

        return customId;
    } else {
        return dbFile.metadata.id;
    }
}

async function getUniqueFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return hash;
}

export const POST: RequestHandler = async ({ request }) => {
    console.log('Received request to upload image');
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(
                JSON.stringify({ message: 'No image uploaded' }), 
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',  // Permitir todas as origens
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',  // Permitir os métodos
                        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir cabeçalhos necessários
                     }
                }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return new Response(
                JSON.stringify({ message: 'File must be an image' }), 
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const result = await saveImage(file);

        return new Response(
            JSON.stringify({
                success: true,
                id: result
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (err) {
        console.error('Image upload failed:', err);
        return new Response(
            JSON.stringify({ 
                message: 'Failed to upload image', 
                error: (err as Error).message 
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};