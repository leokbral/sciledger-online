import { Schema } from "mongoose";

export const InvitationSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    // paperId: { type: String, required: true }, // ID do paper
    reviewer: {  type: String, ref: 'User', required: true }, // Um único revisor
    // peerReviewType: { type: String, enum: ['open', 'selected'], required: true }, // Tipo de revisão
    hubId: { type: String, required: true }, // ID do hub (opcional)
    // isLinkedToHub: { type: Boolean, required: true }, // Se está vinculado a um hub
    status: { type: String, enum: ['pending', 'accepted', 'declined'], required: true }, // Status
    assignedAt: { type: Date, required: true, default: Date.now }, // Quando foi designado
    respondedAt: { type: Date, required: false }, // Quando respondeu
    createdAt: { type: Date, default: Date.now }, // Data de criação
    updatedAt: { type: Date, default: Date.now }, // Data de atualização
},
    { collection: 'invitations' });