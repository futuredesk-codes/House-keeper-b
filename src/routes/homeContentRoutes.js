import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { getHomeContent, uploadHomeVideo } from '../controllers/homeContentController.js';

const router = Router();

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files are allowed'));
  },
});

// Public read — the Flutter app's home screen fetches the current video URL.
router.get('/', getHomeContent);

// Admin upload — replaces the current home-screen video.
router.post('/video', authenticate, requirePermission('settings:manage'), uploadVideo.single('video'), uploadHomeVideo);

export default router;
