import mongoose from 'mongoose';

const ReviewQueueSchema = new mongoose.Schema({
    paperId: { type: String, required: true },
    assignedReviewers: [{ type: String, ref: 'User' }],
    peerReviewType: { type: String, enum: ['open', 'selected'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], required: true },
    assignedAt: { type: Date, default: Date.now }
});

const ReviewQueueModel = mongoose.model('reviewqueue', ReviewQueueSchema);
export default ReviewQueueModel;
