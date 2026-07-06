import multer from 'multer';
import { cloudinary } from '../config/cloudinary.js';
import Document from '../models/Document.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── multer — memory storage, 10 MB, accept any file type ───────────────────
export const uploadServiceDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Upload a buffer to Cloudinary as a public file (images, PDFs, docs).
async function uploadToCloudinary(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'houseker/service-documents',
        resource_type: 'auto',
        public_id: `doc_${userId}_${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/user/service-requests/upload-document
// Body: multipart/form-data with field 'file'
// Uploads to Cloudinary (public), saves metadata in Document collection,
// and returns the public URL so the client can include it in the
// next submission payload (used by file/image/video fields in a service's
// dynamic formSchema).
// ─────────────────────────────────────────────────────────────────────────────
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const result = await uploadToCloudinary(req.file.buffer, req.userId);

  // Save document metadata in MongoDB (Document collection)
  const doc = await Document.create({
    ownerUserId: req.userId,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageKey: result.url,
    uploadedBy: { id: req.userId, role: 'user' },
    visibility: 'user_visible',
    category: 'other',
    status: 'pending_review',
  });

  res.status(201).json({
    id: doc._id,
    url: result.url,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});
