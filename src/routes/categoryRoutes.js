import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listCategories, createCategory, updateCategory, deleteCategory,
} from '../controllers/categoryController.js';

const router = Router();

// Public read (used by the app's category filter); mutations require settings:manage
router.get('/', listCategories);
router.post('/', authenticate, requirePermission('settings:manage'), createCategory);
router.patch('/:id', authenticate, requirePermission('settings:manage'), updateCategory);
router.delete('/:id', authenticate, requirePermission('settings:manage'), deleteCategory);

export default router;
