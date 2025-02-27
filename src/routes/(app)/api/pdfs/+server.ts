import type { RequestHandler } from '@sveltejs/kit';

import { fsFiles } from '$lib/db/fs';


export const GET: RequestHandler = async () => {
    try {
        const pdfs = await fsFiles.find({}, {
            projection: {
                filename: 1,
                'metadata.id': 1,
                contentType: 1,
                uploadDate: 1
            }
        }).toArray();

        return new Response(JSON.stringify(pdfs), {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Erro ao recuperar PDFs:', error);
        return new Response('Erro ao recuperar PDFs', { status: 500 });
    }
};
