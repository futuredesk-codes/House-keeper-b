import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  userStats, listUsers, getUser, createUser, updateUser,
  updateKyc, blockUser, unblockUser, addUserNote,
} from '../controllers/userController.js';

const router = Router();

router.use(authenticate);

// Stats must be before /:id
router.get('/stats', requirePermission('user:view'), userStats);
router.get('/', requirePermission('user:view'), listUsers);
router.get('/:id', requirePermission('user:view'), getUser);
router.post('/', requirePermission('user:manage'), createUser);
router.patch('/:id', requirePermission('user:manage'), updateUser);
router.patch('/:id/kyc', requirePermission('user:manage'), updateKyc);
router.patch('/:id/block', requirePermission('user:manage'), blockUser);
router.patch('/:id/unblock', requirePermission('user:manage'), unblockUser);
router.post('/:id/notes', requirePermission('user:manage'), addUserNote);

export default router;
