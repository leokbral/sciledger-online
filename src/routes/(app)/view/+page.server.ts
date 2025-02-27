import { MongoClient } from 'mongodb';
import { MONGO_URL } from '$env/static/private';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
// import { fsFiles } from '$lib/db/fs';


const client = new MongoClient(MONGO_URL);

export async function load() {


    await client.connect();
    //const db = client.db('fargodb');
    // const publicationCollection = db.collection('papers');
    //; const Users = db.collection('users'); // Coleção de usuários

    const fetchPaper = async () => {
        const papers = await Papers.find({}, { _id: 0 }).lean().exec();
        console.log(papers)
        // Buscando o artigo na coleção de publicações

        // Buscando informações dos autores, coautores e revisores
        const mainAuthor = await Users.findOne({ id: papers[0].mainAuthor });
        const correspondingAuthor = await Users.findOne({ id: papers[0].correspondingAuthor });
        const coAuthors = await Users.find({ id: { $in: papers[0].coAuthors } }).lean().exec();
        const reviewers = await Users.find({ id: { $in: papers[0].reviewers } }).lean().exec();

        // Incluindo as informações dos autores no artigo
        const paperWithAuthors = {
            ...papers[0],
            mainAuthor: mainAuthor || null,
            correspondingAuthor: correspondingAuthor || null,
            coAuthors: coAuthors || [],
            reviewers: reviewers || []
        };
        return paperWithAuthors;
    }

    // async function fecthPDF() {
    //     try {
    //         const pdf = await fsFiles.findOne({ 'metadata.id': '62f6e411-91bc-44bd-81fe-b3a53a9ba139' }, {
    //             projection: {
    //                 _id: 0,  // Exclui o campo `_id`
    //             }
    //         });

    //         console.log('Serialized PDF:', pdf);

    //         return pdf;
    //     } catch (error) {
    //         console.error('Error loading data:', error);
    //         return {
    //             pdf: {}
    //         };
    //     }
    // }

    return {
        paper: await fetchPaper()/* ,
        pdf: await fecthPDF() */
    };
};


