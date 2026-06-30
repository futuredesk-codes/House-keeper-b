import mongoose from 'mongoose';

// Property/location details linked to user/case. Spec 9.1 "Property".
const propertySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    address: { type: String },
    district: { type: String },
    tehsil: { type: String },
    village: { type: String },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    propertyType: { type: String },
    area: { type: String }, // e.g. "5 Kanals"
    ownershipStatus: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model('Property', propertySchema);
