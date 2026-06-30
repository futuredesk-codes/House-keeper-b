import mongoose from 'mongoose';
import { DOCUMENT_STATUSES, DOCUMENT_CATEGORIES, DOCUMENT_VISIBILITY } from '../constants/statuses.js';

// Secure file metadata. Spec 9.1 "Document" + 7.8. Never stores public URLs;
// access is always via short-lived signed URLs (spec 12.2).
const documentSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    category: { type: String, enum: DOCUMENT_CATEGORIES, default: 'other' },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    storageKey: { type: String, required: true }, // internal key, NOT a public URL
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'pending_review' },
    uploadedBy: {
      id: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String }, // 'user' | 'team'
    },
    visibility: { type: String, enum: DOCUMENT_VISIBILITY, default: 'private' },
    sharingDisabled: { type: Boolean, default: false }, // admin can lock sensitive docs
    remarks: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model('Document', documentSchema);
