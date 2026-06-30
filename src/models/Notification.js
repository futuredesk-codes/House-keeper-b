import mongoose from 'mongoose';
import { NOTIFICATION_CHANNELS } from '../constants/statuses.js';

// Push/email/in-app notification log. Spec 9.1 "Notification" + 11.
// Every notification is logged for support and debugging (spec 12.2).
const notificationSchema = new mongoose.Schema(
  {
    recipientType: { type: String, enum: ['user', 'team'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    teamMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', index: true },
    title: { type: String, required: true },
    body: { type: String },
    type: { type: String }, // trigger name, e.g. 'case_created'
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    relatedType: { type: String }, // 'enquiry' | 'case' | ...
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'in_app' },
    sentAt: { type: Date, default: Date.now },
    readAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model('Notification', notificationSchema);
