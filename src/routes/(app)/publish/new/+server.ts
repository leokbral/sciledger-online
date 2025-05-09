import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as crypto from 'crypto';
//import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import type { User } from '$lib/types/User';

export const POST: RequestHandler = async ({ request }) => {

    await start_mongo(); // Não necessário mais

    try {
        const { paperPictures, content, mainAuthor, correspondingAuthor, title, abstract, keywords, pdfUrl, submittedBy, price, coAuthors, status, authors } =
            await request.json();
        console.log("chamou server")
        console.log(mainAuthor, correspondingAuthor, title, abstract, keywords, pdfUrl, submittedBy)
        // Verifica se todas as informações necessárias foram enviadas
        if (!mainAuthor || !correspondingAuthor || !title || !abstract || !keywords || !pdfUrl || !submittedBy) {
            /* console.log(firstName, lastName, country, dob, email, password, confirmPassword) */
            return json({ error: `Todos os campos são obrigatórios. ${mainAuthor}, ${correspondingAuthor}, ${title}, ${abstract}, ${keywords}, ${pdfUrl}, ${submittedBy}` }, { status: 400 });
        }

        const _coAuthors = coAuthors.map((a: User) => a.id)
        const _authors = authors?.map((a: User) => a.id) || [];
        console.log("coAu", _coAuthors, coAuthors)
        const id = crypto.randomUUID()
        // Cria um novo paper
        const newPaper = new Papers({
            _id: id,
            id: id,
            mainAuthor: mainAuthor.id,
           
            correspondingAuthor: correspondingAuthor.id,
            coAuthors: _coAuthors,
            authors: _authors,
            status,
            content,
            paperPictures, title, abstract, keywords, pdfUrl, submittedBy: submittedBy.id, price,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log("newPaper", newPaper)
        // Salva o usuário no banco de dados
        await newPaper.save();

        // Buscar e atualizar o autor principal
        const user = await Users.findById(mainAuthor.id);
        if (!user) {
            return json({ error: 'Autor principal não encontrado.' }, { status: 404 });
        }
        user.papers.push(newPaper.id);
        await user.save();

        // Buscar e atualizar os coautores
        for (const coAuthorId of _coAuthors) {
            const coAuthor = await Users.findById(coAuthorId);
            if (coAuthor) {
                coAuthor.papers.push(newPaper.id);  // Adiciona o artigo ao coautor
                await coAuthor.save();  // Salva as alterações do coautor
            }
        }

        // Resposta de sucesso
        return json({ paper: { id: newPaper.id } }, { status: 201 });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};
