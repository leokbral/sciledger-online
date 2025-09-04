// import Notification from '$lib/db/models/Notification';
// import { json } from '@sveltejs/kit';

// export async function GET({ locals }) {
//     try {
//         const user = locals.user;

//         if (!user) {
//             return json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         const notifications = await Notification.find({ 
//             user: user.id 
//         }).sort({ createdAt: -1 });

//         return json({ success: true, notifications });
//     } catch (error) {
//         console.error('Error fetching notifications:', error);
//         return json({ error: 'Failed to fetch notifications' }, { status: 500 });
//     }
// }

// export async function POST({ request, locals }) {
//     try {
//         const user = locals.user;

//         if (!user) {
//             return json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         const data = await request.json();
        
//         const notification = new Notification({
//             ...data,
//             user: user.id,
//             createdAt: new Date(),
//             updatedAt: new Date()
//         });

//         await notification.save();

//         return json({ success: true, notification });
//     } catch (error) {
//         console.error('Error creating notification:', error);
//         return json({
//             error: 'Failed to create notification',
//             details: error instanceof Error ? error.message : String(error)
//         }, { status: 500 });
//     }
// }
import { MongoClient, GridFSBucket } from 'mongodb';
import type { RequestHandler } from '@sveltejs/kit';
import { MONGO_URL } from '$env/static/private';
import * as crypto from 'crypto';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';

const client = new MongoClient(MONGO_URL);

export const POST: RequestHandler = async ({ request, locals }) => {
    await start_mongo()
    try {
        // Conectando ao banco de dados
        await client.connect();
        const db = client.db('fargodb'); // Nome do banco de dados
        const bucket = new GridFSBucket(db, { bucketName: 'fs' }); // Criando um bucket GridFS (utilizando o bucket padrão 'fs')
        //const paperCollection = db.collection('Papers'); // Coleção para Publicações

        // Obter informações do usuário logado a partir de `locals`
        const user = locals.user;
        if (!user) {
            return new Response(
                JSON.stringify({ error: 'User not authenticated' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Extraindo dados do formulário
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title')?.toString();
        const abstract = formData.get('abstract')?.toString();
        const keywords = formData.get('keywords')?.toString()?.split(',').map(k => k.trim());
        const mainAuthor = user.id; // O autor principal será o usuário logado
        const correspondingAuthor = formData.get('correspondingAuthor')?.toString();
        const coAuthors = formData.get('coAuthors')?.toString()?.split(',').map(coAuthor => coAuthor.trim());
        const tags = formData.get('tags')?.toString()?.split(',').map(t => t.trim());

        // Verificando se o arquivo foi carregado corretamente
        if (!file || !(file instanceof File)) {
            return new Response(
                JSON.stringify({ error: 'No file uploaded or invalid file type' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Armazenando o arquivo PDF no GridFS
        const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
            metadata: {
                submittedBy: user.id, // Guardar o ID do usuário que submeteu o arquivo
                title: title
            }
        });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await new Promise<void>((resolve) => {
            uploadStream.end(buffer, () => {
                resolve();
            });
        });

        const pdfId = uploadStream.id; // ID do arquivo salvo no GridFS
        const paperId= crypto.randomUUID()

        // Armazenando as informações do artigo na coleção de publicações
        const newPaper = new Papers({//await Papers.insertOne({
            _id: paperId,
            paperId,
            title: title,
            abstract: abstract,
            keywords: keywords,
            mainAuthor: mainAuthor,
            correspondingAuthor: correspondingAuthor,
            coAuthors: coAuthors,
            pdfId: pdfId, // Referência ao ID do arquivo PDF no GridFS
            tags: tags,
            status: 'draft',
            submittedBy: user.id, // ID do usuário que submeteu
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newPaper.save();
        return new Response(
            JSON.stringify({ success: true, paperId }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        // Tratamento de erros
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    } finally {
        await client.close();
    }
};

export const GET: RequestHandler = async () => {
    await start_mongo();
    try {
        const hubs = await Hubs.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email')
            .lean();

        return new Response(
            JSON.stringify({ hubs }),
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    } catch (error) {
        console.error('Error fetching hubs:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
};
