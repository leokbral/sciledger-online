import { MongoClient } from 'mongodb';
import { MONGO_URL } from '$env/static/private';
import { error } from '@sveltejs/kit';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import type { Paper } from '$lib/types/Paper';
import type { User } from '$lib/types/User';
// import { fsFiles } from '$lib/db/fs';


const client = new MongoClient(MONGO_URL);

type ViewUser = Pick<User, 'id' | 'firstName' | 'lastName' | 'username'> & {
    profilePictureUrl?: string;
};

type ViewPaper = Omit<
    Paper,
    '_id' | 'mainAuthor' | 'correspondingAuthor' | 'coAuthors' | 'reviewers'
> & {
    mainAuthor: ViewUser | null;
    correspondingAuthor: ViewUser | null;
    coAuthors: ViewUser[];
    reviewers: ViewUser[];
};

function toViewUser(user: Partial<User> | null): ViewUser | null {
    if (!user) return null;

    return {
        id: String(user.id ?? user._id ?? ''),
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        username: user.username ?? '',
        profilePictureUrl: user.profilePictureUrl
    };
}

export async function load() {


    await client.connect();
    //const db = client.db('fargodb');
    // const publicationCollection = db.collection('papers');
    //; const Users = db.collection('users'); // Coleção de usuários

    const fetchPaper = async (): Promise<ViewPaper> => {
        const papers = (await Papers.find({}, { _id: 0 }).lean().exec()) as Array<Omit<Paper, '_id'>>;
        const paper = papers[0];
        if (!paper) throw error(404, 'Paper not found');
        // Buscando o artigo na coleção de publicações

        // Buscando informações dos autores, coautores e revisores
        const mainAuthor = toViewUser(await Users.findOne({ id: paper.mainAuthor }));
        const correspondingAuthor = toViewUser(await Users.findOne({ id: paper.correspondingAuthor }));
        const coAuthors = (await Users.find({ id: { $in: paper.coAuthors } }).lean().exec())
            .map((user) => toViewUser(user))
            .filter((user): user is ViewUser => user !== null);
        const reviewers = (await Users.find({ id: { $in: paper.reviewers } }).lean().exec())
            .map((user) => toViewUser(user))
            .filter((user): user is ViewUser => user !== null);

        // Incluindo as informações dos autores no artigo
        const paperWithAuthors: ViewPaper = {
            ...paper,
            mainAuthor,
            correspondingAuthor,
            coAuthors,
            reviewers
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
