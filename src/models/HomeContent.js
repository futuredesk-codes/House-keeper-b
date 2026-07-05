import mongoose from 'mongoose';

// Singleton document holding the current admin-managed home-screen video.
const homeContentSchema = new mongoose.Schema(
  {
    homeVideoUrl: { type: String, trim: true },
    homeVideoPublicId: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
  },
  { timestamps: true },
);

export default mongoose.model('HomeContent', homeContentSchema);
