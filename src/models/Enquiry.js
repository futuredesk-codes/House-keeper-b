import mongoose from 'mongoose';
import { generateId } from './Counter.js';
import {
  ENQUIRY_TYPES, ENQUIRY_SOURCES, ENQUIRY_STATUSES, PRIORITIES, USER_TYPES,
} from '../constants/statuses.js';

// Master record for EVERY enquiry from app/web/admin. The Unified Enquiry Center is
// the single source of truth (spec 6). No request should live only in email/WhatsApp.
const enquirySchema = new mongoose.Schema(
  {
    enquiryId: { type: String, unique: true, index: true }, // ENQ-2026-000124
    type: { type: String, enum: ENQUIRY_TYPES, required: true, index: true },
    source: { type: String, enum: ENQUIRY_SOURCES, required: true },

    // Lead attribution metadata (spec 12.2)
    sourceModule: { type: String },
    sourceScreen: { type: String },
    campaign: { type: String },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Guest enquiries allowed (web forms) - captured inline when no userId
    guestInfo: {
      name: String,
      phone: String,
      email: String,
    },
    userType: { type: String, enum: USER_TYPES, default: 'guest' },

    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    serviceName: { type: String }, // denormalised label for list display
    location: {
      district: String,
      tehsil: String,
      village: String,
      label: String,
    },

    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'normal', index: true },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', index: true },
    followUpAt: { type: Date },

    submittedData: { type: mongoose.Schema.Types.Mixed, default: {} }, // dynamic form answers
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    // Conversion links (spec 12.2 traceability)
    linkedCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    linkedProjectLeadId: { type: mongoose.Schema.Types.ObjectId },
    linkedJDId: { type: mongoose.Schema.Types.ObjectId },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },

    notes: [
      {
        body: String,
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
        mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' }],
        important: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

enquirySchema.pre('save', async function genId(next) {
  if (this.isNew && !this.enquiryId) {
    this.enquiryId = await generateId('ENQ');
  }
  next();
});

export default mongoose.model('Enquiry', enquirySchema);
