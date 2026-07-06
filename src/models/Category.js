import mongoose from 'mongoose';

// Service category catalogue (e.g. NRK, KP) — managed by admin, referenced by
// Service.category (matched by name) and shown as filter tabs in the app.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Category', categorySchema);
