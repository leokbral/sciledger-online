import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as crypto from 'crypto';
//import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import type { User } from '$lib/types/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.preview'
});

function normalizeAuthorAffiliations(input: unknown) {
    if (!Array.isArray(input)) return [];

    return input
        .map((item) => {
            const affiliation = item as Record<string, unknown>;
            const name = String(affiliation.name ?? '').trim();
            if (!name) return null;

            return {
                userId: affiliation.userId ? String(affiliation.userId) : undefined,
                username: affiliation.username ? String(affiliation.username) : undefined,
                name,
                department: String(affiliation.department ?? '').trim(),
                affiliation: String(affiliation.affiliation ?? '').trim()
            };
        })
        .filter(Boolean);
}

export const POST: RequestHandler = async ({ request }) => {

    await start_mongo(); // Não necessário mais

    try {
        const { paperPictures, content, mainAuthor, correspondingAuthor, title, abstract, keywords, pdfUrl, submittedBy, price, coAuthors, status, authors, authorAffiliations, hubId, isLinkedToHub, scopusArea, scopusSubArea, scopusClassifications, supplementaryMaterials, supplementaryFiles, paymentAuthorizationCode } =
            await request.json();
        console.log("chamou server")
        console.log(mainAuthor, correspondingAuthor, title, abstract, keywords, pdfUrl, submittedBy)
        
        // Verifica se todas as informações necessárias foram enviadas
        if (!mainAuthor || !correspondingAuthor || !title || !abstract || !keywords || !pdfUrl || !submittedBy) {
            /* console.log(firstName, lastName, country, dob, email, password, confirmPassword) */
            return json({ error: `Todos os campos são obrigatórios. ${mainAuthor}, ${correspondingAuthor}, ${title}, ${abstract}, ${keywords}, ${pdfUrl}, ${submittedBy}` }, { status: 400 });
        }

        const isStandaloneSubmission = !hubId && !isLinkedToHub;
        const currentStatus = status || 'draft';
        const requiresPaymentAuthorization = isStandaloneSubmission && currentStatus !== 'draft';

        // Para paper avulso, o bloqueio de pagamento é obrigatório
        if (requiresPaymentAuthorization && !paymentAuthorizationCode) {
            return json({ error: 'Payment authorization required. Please complete the payment hold step.' }, { status: 403 });
        }

        // Verificar o status da autorização no Stripe
        let paymentIntentData = null;
        try {
            if (!paymentAuthorizationCode) {
                throw new Error('No payment authorization code provided');
            }

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentAuthorizationCode);
            
            if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
                return json({ 
                    error: `Invalid payment authorization status: ${paymentIntent.status}. Please complete the payment hold.`,
                    currentStatus: paymentIntent.status
                }, { status: 403 });
            }

            paymentIntentData = {
                stripePaymentIntentId: paymentIntent.id,
                status: paymentIntent.status === 'requires_capture' ? 'authorized' : 'authorized',
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                authorizedAt: new Date(paymentIntent.created * 1000),
                receiptUrl: paymentIntent.charges.data[0]?.receipt_url || null
            };
        } catch (stripeError) {
            if (requiresPaymentAuthorization) {
                console.error('Stripe verification error:', stripeError);
                return json({ error: 'Failed to verify payment authorization' }, { status: 400 });
            }
        }

        const _coAuthors = coAuthors.map((a: User) => a.id)
        const _authors = authors?.map((a: User) => a.id) || [];
        const normalizedAuthorAffiliations = normalizeAuthorAffiliations(authorAffiliations);
        console.log("coAu", _coAuthors, coAuthors)
        const id = crypto.randomUUID()
        // Cria um novo paper
        const newPaper = new Papers({
            _id: id,
            id: id,
            mainAuthor: mainAuthor.id,
           
            correspondingAuthor: correspondingAuthor.id,
            coAuthors: _coAuthors,
            authorAffiliations: normalizedAuthorAffiliations,
            authors: _authors,
            status,
            content,
            paperPictures, title, abstract, keywords, pdfUrl, submittedBy: submittedBy.id, price,
            ...(hubId && { hubId, isLinkedToHub: true }),
            ...(scopusArea && { scopusArea }),
            ...(scopusSubArea && { scopusSubArea }),
            ...(scopusClassifications && scopusClassifications.length > 0 && { scopusClassifications }),
            ...(supplementaryMaterials && supplementaryMaterials.length > 0 && { supplementaryMaterials }),
                        ...(supplementaryFiles && supplementaryFiles.length > 0 && { supplementaryFiles }),
            // Adicionar dados de pagamento
            ...(paymentIntentData && { paymentHold: paymentIntentData }),
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

