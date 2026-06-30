import { Router } from 'express';
import * as enquiryController from '../controllers/enquiryController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

const VIEW = [PERMISSIONS.ENQUIRY_VIEW_ALL, PERMISSIONS.ENQUIRY_VIEW_ASSIGNED];

// /stats must be registered before /:id, otherwise Express matches "stats"
// against the :id param route.
router.get('/stats', requireAnyPermission(...VIEW), enquiryController.enquiryStats);
router.get('/', requireAnyPermission(...VIEW), enquiryController.listEnquiries);
router.post('/', requirePermission(PERMISSIONS.ENQUIRY_CREATE), enquiryController.createEnquiry);
router.get('/:id', requireAnyPermission(...VIEW), enquiryController.getEnquiry);
router.patch('/:id', requirePermission(PERMISSIONS.ENQUIRY_UPDATE), enquiryController.updateEnquiry);
router.patch('/:id/assign', requirePermission(PERMISSIONS.ENQUIRY_ASSIGN), enquiryController.assignEnquiry);
router.post('/:id/notes', requirePermission(PERMISSIONS.ENQUIRY_UPDATE), enquiryController.addEnquiryNote);
router.patch('/:id/convert', requirePermission(PERMISSIONS.ENQUIRY_CONVERT), enquiryController.convertEnquiry);

export default router;
