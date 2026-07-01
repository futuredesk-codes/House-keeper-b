import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listFieldReports, getFieldReport, createFieldReport, updateFieldReport,
  submitForReview, approveFieldReport, rejectFieldReport, publishFieldReport,
} from '../controllers/fieldReportController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('field:view'), listFieldReports);
router.get('/:id', requirePermission('field:view'), getFieldReport);
router.post('/', requirePermission('field:upload_report'), createFieldReport);
router.patch('/:id', requirePermission('field:upload_report'), updateFieldReport);
router.patch('/:id/review', requirePermission('field:upload_report'), submitForReview);
router.patch('/:id/approve', requirePermission('field:publish_report'), approveFieldReport);
router.patch('/:id/reject', requirePermission('field:publish_report'), rejectFieldReport);
router.patch('/:id/publish', requirePermission('field:publish_report'), publishFieldReport);

export default router;
