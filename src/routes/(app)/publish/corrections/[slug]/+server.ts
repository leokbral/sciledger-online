import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import '$lib/db/models/User';
import '$lib/db/models/MessageFeed';
import '$lib/db/models/Paper';
import { NotificationService } from '$lib/services/NotificationService';

import MessageFeeds from '$lib/db/models/MessageFeed';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';

export const POST: RequestHandler = async ({ request, params }) => {
    await start_mongo();
    
    try {
        const body = await request.json();
        
        // Verificar se é para salvar progresso de correções
        if (body.action === 'saveCorrectionProgress') {
            console.log('Recebida requisição para salvar progresso de correções');
            const { correctionProgress } = body;
            const paperId = params.slug;
            
            console.log('Paper ID:', paperId);
            console.log('Correction Progress:', correctionProgress);
            
            if (!correctionProgress || !paperId) {
                console.log('Erro: correctionProgress ou paperId ausentes');
                return json({ error: 'correctionProgress e paperId são obrigatórios.' }, { status: 400 });
            }
            
            // Atualizar o progresso das correções no paper
            console.log('Atualizando paper no banco de dados...');
            const updatedPaper = await Papers.findOneAndUpdate(
                { id: paperId },
                {
                    correctionProgress: new Map(Object.entries(correctionProgress)),
                    updatedAt: new Date().toISOString()
                },
                {
                    new: true,
                    runValidators: true
                }
            ).lean().exec();
            
            console.log('Paper atualizado:', updatedPaper ? 'Sucesso' : 'Falhou');
            
            if (!updatedPaper) {
                console.log('Erro: Paper não encontrado com ID:', paperId);
                return json({ error: 'Paper não encontrado.' }, { status: 404 });
            }

            // Verificar se é uma nova versão com correções significativas
            const existingProgress = updatedPaper.correctionProgress || {};
            const newProgressEntries = Object.entries(correctionProgress);
            const completedCorrections = newProgressEntries.filter(([, completed]) => completed).length;
            const hasSignificantProgress = completedCorrections > Object.keys(existingProgress).length * 0.5;

            // Se houver progresso significativo, criar notificações
            if (hasSignificantProgress) {
                try {
                    // Buscar informações do autor
                    const author = await Users.findOne({ id: updatedPaper.mainAuthor || updatedPaper.submittedBy });
                    const authorName = author ? `${author.firstName} ${author.lastName}` : 'Autor';
                    const authorId = typeof updatedPaper.mainAuthor === 'string' ? updatedPaper.mainAuthor : String(updatedPaper.mainAuthor);
                    const submittedById = typeof updatedPaper.submittedBy === 'string' ? updatedPaper.submittedBy : String(updatedPaper.submittedBy);

                    // Buscar revisores se houver
                    const reviewerIds = updatedPaper.peer_review?.assignedReviewers?.map((r: string | object) => String(r)) || [];

                    await NotificationService.createCorrectionsSubmittedNotifications({
                        paperId: updatedPaper.id,
                        paperTitle: updatedPaper.title,
                        authorId: authorId,
                        authorName: authorName,
                        editorId: submittedById, // usando submittedBy como fallback para editor
                        reviewerIds: reviewerIds,
                        correctionVersion: 1, // pode ser melhorado para rastrear versões
                        requiresNewReview: completedCorrections > 0.8 * newProgressEntries.length, // se > 80% completado
                        hubId: typeof updatedPaper.hubId === 'string' ? updatedPaper.hubId : undefined
                    });
                } catch (notificationError) {
                    console.error('Error creating correction notifications:', notificationError);
                    // Não falhar a operação principal por causa das notificações
                }
            }
            
            const responseProgress = updatedPaper.correctionProgress instanceof Map 
                ? Object.fromEntries(updatedPaper.correctionProgress)
                : updatedPaper.correctionProgress || {};
                
            console.log('Enviando resposta de sucesso');
            return json({ 
                success: true, 
                correctionProgress: responseProgress
            }, { status: 200 });
        }
        
        // Lógica original para mensagens
        const { newMessage, id } = body;
        if (!newMessage) {
            return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
        }
        
        const updMessageFeed = await MessageFeeds.findByIdAndUpdate(
            id,
            {
                currentMessage: '',
                $push: {
                    messages: newMessage
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).populate('messages.sender').lean().exec();

        if (!updMessageFeed) {
            throw new Error('newMessage not found');
        }
        
        console.log(updMessageFeed);
        return json({ updMessageFeed }, { status: 201 });

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
};
