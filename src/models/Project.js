import mongoose from 'mongoose';
import { PROJECT_STATUSES } from '../constants/statuses.js';

// One row of a project's payment/installment plan, e.g. { label: 'Booking Amount', value: '10%' }.
const paymentPlanItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String }, // freeform: "10%", "₹2,00,000", etc.
  },
  { _id: false },
);

// Houseker real estate project content for the "Our Projects" module. Spec 9.1 + 7.5.
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String }, // residential colony, plotted, apartments, mixed-use
    location: {
      district: String,
      locality: String,
      coordinates: { lat: Number, lng: Number },
    },
    status: { type: String, enum: PROJECT_STATUSES, default: 'upcoming' },
    startingPrice: { type: String },
    heroImage: { type: String }, // Cloudinary URL for the project banner (see /api/projects/:id/upload)
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    floorPlans: [
      {
        name: String,
        file: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      },
    ],
    amenities: [String],
    description: { type: String },
    featured: { type: Boolean, default: false },

    // UI content fields (project detail + express interest screen)
    highlights: [String],          // checklist items (Gated Community, Parks, etc.)
    availableOptions: [String],    // plot sizes: ["5 Marla", "7 Marla", "10 Marla", "1 Kanal"]
    possessionYear: { type: String }, // e.g. "2024"
    plotDetails: { type: String }, // short label e.g. "5 Marla-1 Kanal"
    paymentPlan: { type: [paymentPlanItemSchema], default: [] }, // installment/payment plan rows
    brochure: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },

    internalNotes: { type: String }, // not visible to user
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Project', projectSchema);
