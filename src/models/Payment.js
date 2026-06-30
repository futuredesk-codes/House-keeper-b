import mongoose from 'mongoose';
import { PAYMENT_STATUSES } from '../constants/statuses.js';

// Payment/invoice tracking. Spec 9.1 "Payment" + 7.11.
const paymentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    purpose: { type: String }, // service fee, booking interest, consultation
    status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    gatewayRef: { type: String },
    gatewayFailureReason: { type: String },
    invoiceStorageKey: { type: String },
    remarks: { type: String }, // required for manual status changes (spec 10.2)
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model('Payment', paymentSchema);
