import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listProjects, getProject, createProject, updateProject, toggleActive, toggleFeatured, uploadProjectImage,
} from '../controllers/projectController.js';

const router = Router();

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'image/svg+xml') return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// Public read (list + get)
router.get('/', listProjects);
router.get('/:id', getProject);

// Mutations require authentication + project:manage
router.post('/', authenticate, requirePermission('project:manage'), createProject);
router.patch('/:id', authenticate, requirePermission('project:manage'), updateProject);
router.patch('/:id/toggle-active', authenticate, requirePermission('project:manage'), toggleActive);
router.patch('/:id/toggle-featured', authenticate, requirePermission('project:manage'), toggleFeatured);
router.post('/:id/upload', authenticate, requirePermission('project:manage'), uploadImage.single('file'), uploadProjectImage);

export default router;
