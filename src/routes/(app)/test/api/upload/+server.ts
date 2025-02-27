import { MongoClient } from 'mongodb';
import type { RequestHandler } from '@sveltejs/kit';
import { MONGO_URL } from '$env/static/private';
import { pdfs } from '$lib/db/pdfs';

const client = new MongoClient(MONGO_URL);

export const POST: RequestHandler = async ({ request }) => {
    try {
        // await client.connect();
        // const db = client.db('fargodb'); // Nome do banco de dados
        // const collection = db.collection('pdfs'); // Nome da coleção

        const formData = await request.formData();
        const file = formData.get('file') as File;
        console.log("chamou", file)
        if (!file || !(file instanceof File)) {
           
            return new Response(
                JSON.stringify({ error: 'No file uploaded or invalid file type' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // Verifica se o `file` é uma instância de `File` e extrai o nome
        const filename = file.name;

        // Supondo que você queira armazenar informações do PDF
        const result = await pdfs.insertOne({
            filename: filename,
            // outros campos que você deseja adicionar
        });

        return new Response(
            JSON.stringify({ success: true, insertedId: result.insertedId.toString() }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        // Assegura que `error` é tratado como string para o retorno
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    } finally {
        await client.close();
    }
};
