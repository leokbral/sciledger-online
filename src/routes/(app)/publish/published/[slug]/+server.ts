import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
//import * as crypto from 'crypto';
//import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import '$lib/db/models/User';
import type { User } from '$lib/types/User';

export const POST: RequestHandler = async ({ request }) => {

    await start_mongo();

    try {
        const { id, mainAuthor, correspondingAuthor, title, abstract, keywords, pdfUrl, submittedBy, price, coAuthors, status, authors, peer_review, selectedReviewers  } =
            await request.json();

        // console.log(mainAuthor, correspondingAuthor, title, abstract, keywords, pdfUrl, submittedBy)
        // Verifica se todas as informações necessárias foram enviadas
        if (!mainAuthor || !correspondingAuthor || !title || !abstract || !keywords || !pdfUrl || !submittedBy) {
            /* console.log(firstName, lastName, country, dob, email, password, confirmPassword) */
            return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
        }

        const _coAuthors = coAuthors.map((a: User) => a.id)
        const _authors = authors.map((a: User) => a.id)

        const paper = await Papers.findByIdAndUpdate(
            id,
            {
                mainAuthor: mainAuthor.id,
                authors: _authors,
                correspondingAuthor: correspondingAuthor,
                coAuthors: _coAuthors,
                status: status,
                title: title,
                abstract: abstract,
                keywords: keywords,
                pdfUrl: pdfUrl,
                submittedBy: submittedBy,
                price: price,
                peer_review,
                selectedReviewers,
                updatedAt: new Date().toISOString(),
            },
            { new: true, runValidators: true } // Retorna o documento atualizado e aplica validação
        ).lean().exec();

        if (!paper) {
            throw new Error('Paper not found');
        }
        return json({ paper }, { status: 201 });
        
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};
