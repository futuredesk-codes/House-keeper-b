import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listServices, getService, createService, updateService, toggleService, uploadServiceImage,
} from '../controllers/serviceController.js';

const router = Router();

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'image/svg+xml') return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// Public read; mutation routes require settings:manage
router.get('/', listServices);
router.get('/:id', getService);
router.post('/', authenticate, requirePermission('settings:manage'), createService);
router.patch('/:id', authenticate, requirePermission('settings:manage'), updateService);
router.patch('/:id/toggle', authenticate, requirePermission('settings:manage'), toggleService);
router.post('/:id/upload', authenticate, requirePermission('settings:manage'), uploadImage.single('file'), uploadServiceImage);

export default router;
