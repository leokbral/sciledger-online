import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';

export const POST: RequestHandler = async ({ request }) => {
    await start_mongo();

    try {
        const {
            title,
            description,
            createdBy,
            startDate,
            endDate,
            submissionStartDate,
            submissionEndDate,
            reviewers,
            location,
            tags
        } = await request.json();

        // Validação de campos obrigatórios
        if (
            !title ||
            !description ||
            !createdBy?.id ||
            !startDate ||
            !endDate ||
            !submissionStartDate ||
            !submissionEndDate
        ) {
            return json(
                {
                    error: 'Todos os campos obrigatórios devem ser preenchidos.'
                },
                { status: 400 }
            );
        }

        // Verifica se o usuário existe
        const user = await Users.findById(createdBy.id);
        if (!user) {
            return json({ error: 'Usuário criador não encontrado.' }, { status: 404 });
        }

        const id = crypto.randomUUID();

        // Criação do novo Hub
        const newHub = new Hubs({
            _id: id,
            id,
            title,
            description,
            createdBy: createdBy.id,
            startDate,
            endDate,
            submissionStartDate,
            submissionEndDate,
            reviewers: reviewers?.map((r: { id: string }) => r.id) || [],
            location: location || 'online',
            tags: tags || [],
            submittedPapers: [],
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newHub.save();

        // Atualiza o usuário com o Hub criado
        user.hubs = user.hubs || [];
        user.hubs.push(newHub.id);
        await user.save();

        return json({ hub: { id: newHub.id } }, { status: 201 });
    } catch (error) {
        console.error('Erro ao criar hub:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};
