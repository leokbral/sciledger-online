import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import MessageFeeds from '$lib/db/models/MessageFeed';

export const POST: RequestHandler = async ({ request }) => {
    await start_mongo();

    try {
        const { id, sender, message, isRead, timestamp, color } = await request.json();

        const missingFields: string[] = [];

        if (!id) missingFields.push('id');
        if (!sender) missingFields.push('sender');
        if (!message) missingFields.push('message');
        if (isRead === undefined) missingFields.push('isRead');
        if (!timestamp) missingFields.push('timestamp');
        if (!color) missingFields.push('color');

        if (missingFields.length > 0) {
            console.warn('Campos obrigatórios faltando:', missingFields);
            return json({ error: `Campos obrigatórios faltando: ${missingFields.join(', ')}` }, { status: 400 });
        }

        // const newMessage = await MessageFeeds.updateOne({
        //     id,
        //     sender,
        //     message,
        //     isRead,
        //     timestamp,
        //     color
        // });
        const newMessage = await MessageFeeds.updateOne(
            { id }, // Aqui deve ser a condição de busca
            {
                $push: {
                    sender,
                    message,
                    isRead,
                    timestamp,
                    color
                }
            },
            { upsert: true } // Se o documento não existir, ele cria um novo
        );

        // const newMessage = {
        //     sender,
        //     message,
        //     isRead,
        //     timestamp,
        //     color
        // };

        // await MessageFeeds.updateOne(
        //     { id },
        //     { $push: { messages: newMessage } }, // Adiciona nova mensagem ao array
        //     { upsert: true }
        // );
        
        return json({ newMessage }, { status: 201 });
    } catch (error) {
        console.error('Erro ao registrar mensagem:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};
