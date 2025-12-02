import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';

export const PUT: RequestHandler = async ({ request, params }) => {
    await start_mongo();

    try {
        const {
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
            socialMedia,
            tracks,
            calendar,
            showCalendar,
            dates
        } = await request.json();

        console.log('Updating hub:', params.id);
        console.log('Received data:', { title, logoUrl, bannerUrl, cardUrl });

        const hub = await Hubs.findById(params.id);
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Update hub fields
        hub.title = title;
        hub.type = type;
        hub.description = description;
        hub.location = location;
        hub.issn = issn;
        hub.guidelinesUrl = guidelinesUrl || undefined;
        hub.acknowledgement = acknowledgement || undefined;
        hub.licenses = licenses || [];
        hub.extensions = extensions;
        hub.logoUrl = logoUrl;
        hub.bannerUrl = bannerUrl;
        hub.cardUrl = cardUrl;
        hub.peerReview = peerReview;
        hub.authorInvite = authorInvite;
        hub.identityVisibility = identityVisibility;
        hub.reviewVisibility = reviewVisibility;
        hub.socialMedia = {
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
            // weibo: socialMedia?.weibo || '',
            // pinterest: socialMedia?.pinterest || ''
        };
        hub.tracks = tracks;
        hub.calendar = calendar;
        hub.showCalendar = showCalendar || false;
        hub.dates = {
            submissionStart: dates?.submissionStart,
            submissionEnd: dates?.submissionEnd,
            eventStart: dates?.eventStart,
            eventEnd: dates?.eventEnd
        };
        hub.updatedAt = new Date();

        await hub.save();

        return json({ hub: { id: hub.id } }, { status: 200 });
    } catch (error) {
        console.error('Error updating hub:', error);
        return json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
