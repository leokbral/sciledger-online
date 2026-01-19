import mongoose from "mongoose";
import { HubSchema } from "../schemas/HubSchema";
import type { Hub } from "$lib/types/Hub";

export interface IHub extends Hub, Document {
    pdfId: ObjectId | undefined;
}

const Hubs = mongoose.models.Hub || mongoose.model<IHub>('Hub', HubSchema);
export default Hubs;
