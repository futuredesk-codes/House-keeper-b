import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAnyPermission, requirePermission } from '../middleware/rbac.js';
import {
  caseStats, listCases, getCase, updateCase,
  assignCase, addMilestone, updateMilestone, addCaseNote,
} from '../controllers/caseController.js';

const router = Router();

router.use(authenticate);

const canView = requireAnyPermission('case:view_all', 'case:view_assigned');

// /stats before /:id
router.get('/stats', canView, caseStats);
router.get('/', canView, listCases);
router.get('/:id', canView, getCase);
router.patch('/:id', canView, requirePermission('case:update'), updateCase);
router.patch('/:id/assign', canView, requirePermission('case:assign'), assignCase);
router.post('/:id/milestones', canView, requirePermission('case:update'), addMilestone);
router.patch('/:id/milestones/:mid', canView, requirePermission('case:update'), updateMilestone);
router.post('/:id/notes', canView, requirePermission('case:update'), addCaseNote);

export default router;
