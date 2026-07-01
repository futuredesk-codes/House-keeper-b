import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listProjects, getProject, createProject, updateProject, toggleActive, toggleFeatured,
} from '../controllers/projectController.js';

const router = Router();

// Public read (list + get)
router.get('/', listProjects);
router.get('/:id', getProject);

// Mutations require authentication + project:manage
router.post('/', authenticate, requirePermission('project:manage'), createProject);
router.patch('/:id', authenticate, requirePermission('project:manage'), updateProject);
router.patch('/:id/toggle-active', authenticate, requirePermission('project:manage'), toggleActive);
router.patch('/:id/toggle-featured', authenticate, requirePermission('project:manage'), toggleFeatured);

export default router;
