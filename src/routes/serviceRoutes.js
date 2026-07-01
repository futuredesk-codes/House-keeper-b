import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listServices, getService, createService, updateService, toggleService,
} from '../controllers/serviceController.js';

const router = Router();

// Public read; mutation routes require settings:manage
router.get('/', listServices);
router.get('/:id', getService);
router.post('/', authenticate, requirePermission('settings:manage'), createService);
router.patch('/:id', authenticate, requirePermission('settings:manage'), updateService);
router.patch('/:id/toggle', authenticate, requirePermission('settings:manage'), toggleService);

export default router;
