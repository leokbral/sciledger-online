import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { Readable } from 'stream';
import type { RequestHandler } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { fsFiles } from '$lib/db/fs';

const bucket = new GridFSBucket(db);

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

async function saveSupplementaryFile(file: File, uploadedBy?: string) {
    console.log('Saving supplementary file:', file.name, file.size, file.type);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of 10MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    const fileHash = await getUniqueFileHash(file);
    const customId = crypto.randomUUID();

    // Check if file already exists
    const dbFile = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
    console.log('File exists in DB:', dbFile !== null);

    if (!dbFile) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // Save file to MongoDB using GridFS
        const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
            metadata: {
                id: customId,
                fileHash,
                lastModified: file.lastModified,
                size: file.size,
                type: 'supplementary', // Add type to distinguish from images and PDFs
                uploadedBy: uploadedBy || null
            }
        });

        await new Promise((resolve, reject) => {
            stream.pipe(uploadStream)
                .on('error', reject)
                .on('finish', resolve);
        });

        return {
            id: customId,
            fileId: customId,
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type
        };
    } else {
        return {
            id: dbFile.metadata.id,
            fileId: dbFile.metadata.id,
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type
        };
    }
}

async function getUniqueFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return hash;
}

export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};

export const POST: RequestHandler = async ({ request }) => {
    console.log('POST request received for supplementary file upload');
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const uploadedBy = formData.get('uploadedBy') as string;

        if (!file) {
            return new Response(
                JSON.stringify({ message: 'No file uploaded' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({
                    message: 'File size exceeds maximum allowed size of 10MB',
                    maxSize: MAX_FILE_SIZE,
                    currentSize: file.size
                }),
                {
                    status: 413, // Payload Too Large
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }

        const result = await saveSupplementaryFile(file, uploadedBy);

        return new Response(
            JSON.stringify({
                success: true,
                ...result
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    } catch (err) {
        console.error('Supplementary file upload failed:', err);
        return new Response(
            JSON.stringify({
                message: 'Failed to upload supplementary file',
                error: (err as Error).message
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
};
