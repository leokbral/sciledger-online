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
            status,
            title,
            type,
            description,
            location,
            issn,
            guidelinesUrl,
            acknowledgement,
            licenses,
            extensions,
            logoUrl,
            bannerUrl,
            cardUrl,
            peerReview,
            authorInvite,
            identityVisibility,
            reviewVisibility,
            socialMedia,  // Add this line
            tracks,
            calendar,
            showCalendar,
            dates,
            createdBy
        } = await request.json();

        console.log('Received data:', { title, logoUrl, bannerUrl, cardUrl });

        // Validação de campos obrigatórios
        const requiredFields = {
            title,
            type,
            description,
            'createdBy.id': createdBy?.id
        };

        const missingFields = Object.entries(requiredFields)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_, value]) => !value)
            .map(([field]) => field);

        if (missingFields.length > 0) {
            return json(
                {
                    error: `Missing required fields: ${missingFields.join(', ')}`,
                    providedData: requiredFields
                },
                { status: 400 }
            );
        }

        // Verifica se o usuário existe
        const user = await Users.findById(createdBy.id);
        if (!user) {
            return json({ error: 'User not found' }, { status: 404 });
        }

        const id = crypto.randomUUID();

        console.log('Creating hub with images:', { logoUrl, bannerUrl, cardUrl });

        // Criação do novo Hub
        const newHub = new Hubs({
            _id: id,
            id,
            title,
            type,
            description,
            location,
            issn,
            guidelinesUrl,
            acknowledgement,
            licenses: licenses || [],
            extensions,
            logoUrl,
            bannerUrl,
            cardUrl,
            peerReview,
            authorInvite,
            identityVisibility,
            reviewVisibility,
            socialMedia: {
                twitter: socialMedia?.twitter || '',
                facebook: socialMedia?.facebook || '',
                website: socialMedia?.website || '',
                instagram: socialMedia?.instagram || '',
                linkedin: socialMedia?.linkedin || '',
                youtube: socialMedia?.youtube || '',
                tiktok: socialMedia?.tiktok || '',
                github: socialMedia?.github || '',
                discord: socialMedia?.discord || '',
                telegram: socialMedia?.telegram || '',
                whatsapp: socialMedia?.whatsapp || '',
                wechat: socialMedia?.wechat || '',
                weibo: socialMedia?.weibo || '',
                pinterest: socialMedia?.pinterest || ''
            },
            tracks,
            calendar,
            showCalendar: showCalendar || false,
            // Fix the date fields to match exactly with what's being sent
            dates: {
                submissionStart: dates.submissionStart,
                submissionEnd: dates.submissionEnd,
                eventStart: dates.eventStart,
                eventEnd: dates.eventEnd
            },
            createdBy: createdBy.id,
            status: status,
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
        console.error('Error creating hub:', error);
        return json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
