import mongoose from "mongoose";
import { PaperSchema } from "../schemas/PaperSchema";
import type { Paper } from "$lib/types/Paper";

export interface IPaper extends Paper, Document {
    pdfId: ObjectId | undefined;
}

const Papers = mongoose.model<IPaper>('Paper', PaperSchema);
export default Papers;
