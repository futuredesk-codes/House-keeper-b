import { cloudinary } from '../config/cloudinary.js';
import HomeContent from '../models/HomeContent.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Upload a video buffer to Cloudinary. Fixed public_id + overwrite so every
// upload replaces the same asset instead of piling up orphaned videos.
async function uploadVideoToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'houseker/home-content',
        public_id: 'home_video',
        overwrite: true,
        resource_type: 'video',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

// GET /api/home-content — public
export const getHomeContent = asyncHandler(async (req, res) => {
  const content = await HomeContent.findOne();
  res.json({ homeVideoUrl: content?.homeVideoUrl || null });
});

// POST /api/home-content/video — authenticate + settings:manage
export const uploadHomeVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('video file is required');

  const result = await uploadVideoToCloudinary(req.file.buffer);

  let content = await HomeContent.findOne();
  if (!content) content = new HomeContent();
  content.homeVideoUrl = result.secure_url;
  content.homeVideoPublicId = result.public_id;
  content.updatedBy = req.actor?.id;
  await content.save();

  res.json({ success: true, homeVideoUrl: content.homeVideoUrl });
});
