import type { RequestHandler } from '@sveltejs/kit';
import { imgFiles } from '$lib/db/img';

export const GET: RequestHandler = async () => {
    try {
        const images = await imgFiles.find(
            { 'metadata.type': 'image' },  // Filter only images
            {
                projection: {
                    filename: 1,
                    'metadata.id': 1,
                    'metadata.size': 1,
                    contentType: 1,
                    uploadDate: 1
                }
            }
        ).toArray();

        return new Response(JSON.stringify(images), {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Erro ao recuperar imagens:', error);
        return new Response('Erro ao recuperar imagens', { status: 500 });
    }
};