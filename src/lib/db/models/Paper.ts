import mongoose, { Document, type ObjectId } from "mongoose";
import { PaperSchema } from "../schemas/PaperSchema";
import type { Paper } from "$lib/types/Paper";

export interface IPaper extends Omit<Paper, '_id' | 'id'>, Document {
    pdfId?: ObjectId;
}

const Papers = mongoose.models.Paper || mongoose.model<IPaper>('Paper', PaperSchema);
export default Papers;
