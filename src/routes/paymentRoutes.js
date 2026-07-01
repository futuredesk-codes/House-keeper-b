import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  paymentStats, listPayments, getPayment, createPayment, updatePayment,
} from '../controllers/paymentController.js';

const router = Router();

router.use(authenticate);

// /stats before /:id
router.get('/stats', requirePermission('payment:view'), paymentStats);
router.get('/', requirePermission('payment:view'), listPayments);
router.get('/:id', requirePermission('payment:view'), getPayment);
router.post('/', requirePermission('payment:change_status'), createPayment);
router.patch('/:id', requirePermission('payment:change_status'), updatePayment);

export default router;
