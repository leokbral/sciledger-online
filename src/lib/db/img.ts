
import { db } from './mongo';

export const imgFiles = db.collection('img.files');
export const img = db.collection('img'); 


