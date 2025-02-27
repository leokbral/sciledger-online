import { mncs } from '$lib/db/mncs';
import { pdfs } from '$lib/db/pdfs';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ locals }) => {
    console.log("loclas",(locals.user))
    try {
        const mncsData = await mncs.find({}, {
            projection: {
                _id: 0,  // Exclui o campo `_id`
                nome: 1  // Inclui o campo `nome`
            }
        }).toArray();
        console.log('Serialized mncs:', mncsData);

        const pdfsData = await pdfs.find({}, {
            projection: {
                _id: 0,  // Exclui o campo `_id`
                // nome: 1  // Inclui o campo `nome`
            }
        }).toArray();
        console.log('Serialized pdfs - 21:', pdfsData);

        return {
            pdfs: pdfsData,
            mncs: mncsData
        };
    } catch (error) {
        console.error('Error loading data:', error);
        return {
            mncs: [],
            pdfs: []
        };
    }
};
