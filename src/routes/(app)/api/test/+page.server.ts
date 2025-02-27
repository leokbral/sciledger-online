
import type { PageServerLoad } from './$types';
import { fsFiles } from '$lib/db/fs';


export const load: PageServerLoad = async () => {
    try {
        const pdfs = await fsFiles.find({}, {
            projection: {
                _id: 0,  // Exclui o campo `_id`
            }
        }).toArray();

        //console.log('Serialized PDFs:', pdfs);

        return {
            pdfs
        };
    } catch (error) {
        console.error('Error loading data:', error);
        return {
            pdfs: []
        };
    }
};
