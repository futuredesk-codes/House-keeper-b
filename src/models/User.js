import mongoose from 'mongoose';
import { USER_TYPES, KYC_STATUSES, ACCOUNT_STATUSES } from '../constants/statuses.js';

// App user (NRK / KP / Landowner / Buyer-Investor). Spec 9.1 "User".
// Admin/team accounts live in the separate TeamMember collection.
const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    passwordHash: { type: String, select: false },
    userType: { type: String, enum: USER_TYPES, default: 'guest', index: true },
    country: { type: String, trim: true },
    language: { type: String, default: 'en' },
    profileImage: { type: String, trim: true },   // Cloudinary secure_url
    kycStatus: { type: String, enum: KYC_STATUSES, default: 'not_submitted' },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'active', index: true },
    internalNotes: [
      {
        body: String,
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
