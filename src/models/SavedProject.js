import mongoose from 'mongoose';

// App-user bookmark of a Project ("Save Properties" / wishlist feature).
const savedProjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  },
  { timestamps: true },
);

savedProjectSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export default mongoose.model('SavedProject', savedProjectSchema);
