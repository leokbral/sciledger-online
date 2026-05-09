import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { Readable } from 'stream';
import type { RequestHandler } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { fsFiles } from '$lib/db/fs';
const bucket = new GridFSBucket(db);

async function savePDF(file: File) {
    const fileHash = await getUniqueFileHash(file);
    const customId = crypto.randomUUID()
    const dbFile = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
    if (!dbFile) {
        // Converter o File em um Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Criar uma stream a partir do buffer
        const stream = Readable.from(buffer);
        // Salvar o arquivo no MongoDB usando GridFS
        const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
            metadata: {
                id: customId,
                fileHash,
                lastModified: file.lastModified,
                size: file.size,
            },
        });
        stream.pipe(uploadStream)
            .on('error', (error) => {
                console.error('Erro ao salvar o arquivo:', error);
            })
            .on('finish', () => {
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
    const uniqueFileHash = `${hash}`;

    return uniqueFileHash;
}


//   // Exemplo de uso com Express
//   app.get('/download/:id', getPdfByCustomId);


export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
        return new Response(JSON.stringify({ message: 'No file uploaded' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    try {
        // const result = await pdfs.insertOne({
        //     filename: fileName,
        //     // outros campos que você deseja adicionar
        // });

        const result = await savePDF(file);

        return new Response(
            JSON.stringify({
                result
                // src: `https://aulazero.xyz/${fileName}`
                // ... and any additional fields you want to store, such as width, height, color, extension, etc
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (err) {
        console.error('Upload failed:', err);
        return new Response(
            JSON.stringify({ message: 'Failed to upload file', error: (err as Error).message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
