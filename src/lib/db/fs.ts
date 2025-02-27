
import { db } from './mongo';

export const fsFiles = db.collection('fs.files');
export const fs = db.collection('fs'); 


