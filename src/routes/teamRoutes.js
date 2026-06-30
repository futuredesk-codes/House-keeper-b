import { Router } from 'express';
import * as teamController from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.TEAM_VIEW), teamController.listTeamMembers);
router.get('/:id', requirePermission(PERMISSIONS.TEAM_VIEW), teamController.getTeamMember);
router.post('/', requirePermission(PERMISSIONS.TEAM_MANAGE), teamController.createTeamMember);
router.patch('/:id', requirePermission(PERMISSIONS.TEAM_MANAGE), teamController.updateTeamMember);
router.patch('/:id/deactivate', requirePermission(PERMISSIONS.TEAM_MANAGE), teamController.deactivateTeamMember);
router.patch('/:id/reactivate', requirePermission(PERMISSIONS.TEAM_MANAGE), teamController.reactivateTeamMember);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.TEAM_MANAGE, PERMISSIONS.RECORD_DELETE),
  teamController.hardDeleteTeamMember,
);

export default router;
