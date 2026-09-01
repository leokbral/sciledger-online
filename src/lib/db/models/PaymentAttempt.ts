import mongoose, { Document } from 'mongoose';
import { PaymentAttemptSchema } from '../schemas/PaymentAttemptSchema';
import type { PaymentAttempt } from '$lib/types/PaymentAttempt';

export interface IPaymentAttempt extends Omit<PaymentAttempt, '_id' | 'id'>, Document {}

const PaymentAttempts =
	mongoose.models.PaymentAttempt ||
	mongoose.model<IPaymentAttempt>('PaymentAttempt', PaymentAttemptSchema);

export default PaymentAttempts;
