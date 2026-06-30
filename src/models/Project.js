import mongoose from 'mongoose';
import { PROJECT_STATUSES } from '../constants/statuses.js';

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
    heroImage: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
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
    internalNotes: { type: String }, // not visible to user
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Project', projectSchema);
