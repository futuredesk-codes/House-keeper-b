import mongoose from 'mongoose';
import { generateId } from './Counter.js';
import { CASE_STATUSES, PAYMENT_STATUSES, PRIORITIES } from '../constants/statuses.js';

const milestoneSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    expectedDate: { type: Date },
    completedAt: { type: Date },
  },
  { _id: true },
);

// Active execution record after enquiry conversion. Spec 9.1 "Case" + 7.3.
const caseSchema = new mongoose.Schema(
  {
    caseId: { type: String, unique: true, index: true }, // HKR-CASE-2026-00045
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceType: { type: String }, // denormalised service name/category
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },

    // User-submitted form answers and property location for display
    submittedData: { type: mongoose.Schema.Types.Mixed, default: {} },
    location: {
      district: String,
      tehsil: String,
      village: String,
      label: String, // free-text address displayed on case cards
    },

    status: { type: String, enum: CASE_STATUSES, default: 'submitted', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'normal' },

    milestones: { type: [milestoneSchema], default: [] },

    // Multiple assignments allowed (case manager, legal, field agent)
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' }],

    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FieldReport' }],

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    dueDate: { type: Date },

    internalNotes: [
      {
        body: String,
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
        mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' }],
        important: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

caseSchema.pre('save', async function genId(next) {
  if (this.isNew && !this.caseId) {
    this.caseId = await generateId('HKR-CASE', 5);
  }
  next();
});

export default mongoose.model('Case', caseSchema);
