import mongoose from 'mongoose';
import { DraftSchema } from '../schemas/DraftSchema';

// Define the shape of Draft fields here or import from DraftSchema if available
export interface IDraft extends mongoose.Document {
  // Add Draft fields here, for example:
  // title: string;
  // content: string;
}

const DraftModel = mongoose.model<IDraft>('Draft', DraftSchema);
export default DraftModel;
