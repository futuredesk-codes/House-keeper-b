import mongoose from 'mongoose';
import { RISK_RATINGS, REPORT_APPROVAL_STATUSES } from '../constants/statuses.js';

// Inspection / field report record. Spec 9.1 "FieldReport" + 7.9.
// Reports require approval before becoming visible to the user (spec 12.2).
const fieldReportSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
    visitDate: { type: Date },
    purpose: { type: String },
    summary: { type: String },
    boundaryStatus: { type: String },
    accessStatus: { type: String },
    geotags: [
      {
        lat: Number,
        lng: Number,
        label: String,
      },
    ],
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    notes: { type: String },
    riskRating: { type: String, enum: RISK_RATINGS },
    approvalStatus: { type: String, enum: REPORT_APPROVAL_STATUSES, default: 'draft' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model('FieldReport', fieldReportSchema);
