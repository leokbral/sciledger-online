import { model, Document } from 'mongoose';
import { HubSchema } from '../schemas/HubSchema';

export interface IHub extends Document {
    _id: string;
    id: string;
    title: string;
    description: string;
    createdBy: string;
    startDate: string;
    endDate: string;
    submissionStartDate: string;
    submissionEndDate: string;
    reviewers: string[];
    submittedPapers: string[];
    location?: string;
    tags?: string[];
    status: 'draft' | 'open' | 'in_review' | 'closed';
    createdAt: string;
    updatedAt: string;
}

const Hub = model<IHub>('Hub', HubSchema);
export default Hub;
