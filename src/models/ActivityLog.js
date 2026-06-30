import mongoose from 'mongoose';

// Audit trail. Spec 9.1 "ActivityLog" + 11.2. Every status change, verification,
// publish, payment change and role change is recorded with actor + timestamp.
const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId },
    actorRole: { type: String }, // role string or 'user' / 'system'
    actorName: { type: String },
    action: { type: String, required: true }, // e.g. 'enquiry.status_change'
    entityType: { type: String, required: true, index: true }, // 'Enquiry', 'Case', ...
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    remarks: { type: String },
    ip: { type: String },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } },
);

export default mongoose.model('ActivityLog', activityLogSchema);
