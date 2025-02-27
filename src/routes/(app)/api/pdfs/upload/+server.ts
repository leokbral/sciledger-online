import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import { Readable } from 'stream';
import type { RequestHandler } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { fsFiles } from '$lib/db/fs';
console.log("Chamou l7")
const bucket = new GridFSBucket(db);

async function savePDF(file: File) {
console.log("Chamou l11")
    const fileHash = await getUniqueFileHash(file);
    // console.log('File to upload:', {
    //     name: fileHash,
    //     type: file.type,
    //     size: file.size,
    //     file
    // });

    const customId = crypto.randomUUID()
    const dbFile = await fsFiles.findOne({ 'metadata.fileHash': fileHash });
    console.log("Chamou l22")
    if (!dbFile) {
        // Converter o File em um Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Criar uma stream a partir do buffer
        const stream = Readable.from(buffer);
        console.log("Chamou l30")
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
        console.log("Chamou l41")
        stream.pipe(uploadStream)
            .on('error', (error) => {
                console.error('Erro ao salvar o arquivo:', error);
            })
            .on('finish', () => {
                console.log('Arquivo salvo com sucesso!');
            });
        return customId;
    } else {
        console.log("Already in DB!")
        return dbFile.metadata.id;
    }
}

async function getUniqueFileHash(file: File): Promise<string> {
    console.log("Chamou l57")
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const uniqueFileHash = `${hash}`;

    return uniqueFileHash;
}


//   // Exemplo de uso com Express
//   app.get('/download/:id', getPdfByCustomId);


export const POST: RequestHandler = async ({ request }) => {
    console.log("Chamou l72")
    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log("Chamou l75")
    if (!file) {
        return new Response(JSON.stringify({ message: 'No file uploaded' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    console.log("Chamou l82")
    try {
        console.log('Starting upload...');
        // const result = await pdfs.insertOne({
        //     filename: fileName,
        //     // outros campos que você deseja adicionar
        // });

        const result = await savePDF(file);
        console.log('Upload completed.');

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
