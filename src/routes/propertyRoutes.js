import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { listProperties, getProperty, createProperty, updateProperty } from '../controllers/propertyController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('user:view'), listProperties);
router.get('/:id', requirePermission('user:view'), getProperty);
router.post('/', requirePermission('user:manage'), createProperty);
router.patch('/:id', requirePermission('user:manage'), updateProperty);

export default router;
