import { mncs } from '$lib/db/mncs';
import { pdfs } from '$lib/db/pdfs';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const mncsData = await mncs.find({}, {
            projection: {
                _id: 0,  // Exclui o campo `_id`
                nome: 1  // Inclui o campo `nome`
            }
        }).toArray();

        const pdfsData = await pdfs.find({}, {
            projection: {
                _id: 0,  // Exclui o campo `_id`
                // nome: 1  // Inclui o campo `nome`
            }
        }).toArray();

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
