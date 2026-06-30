import mongoose from 'mongoose';

// Chat/support message. Spec 9.1 "Message" + 7.10. Linked to a case or enquiry.
const messageSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['user', 'team'], required: true },
    body: { type: String },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    readAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model('Message', messageSchema);
