import type { RequestHandler } from '@sveltejs/kit';
import { GridFSBucket } from 'mongodb';
import { fsFiles } from '$lib/db/fs';
import { db } from '$lib/db/mongo';

const bucket = new GridFSBucket(db);

export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;
    if (!id) {
        return new Response('ID do PDF não fornecido', { status: 400 });
    }

    try {
        const file = await fsFiles.findOne({ 'metadata.id': id });

        if (!file) {
            return new Response('Arquivo não encontrado', { status: 404 });
        }

        const downloadStream = bucket.openDownloadStream(file._id);

        // Usando o ReadableStream como corpo da resposta
        return new Response(downloadStream as unknown as ReadableStream, {
            headers: {
                'Content-Type': file.contentType,
                'Content-Disposition': `inline; filename="${file.filename}"`,
            },
        });
    } catch (error) {
        console.error('Erro ao recuperar o arquivo:', error);
        return new Response('Erro ao recuperar o arquivo', { status: 500 });
    }
};
