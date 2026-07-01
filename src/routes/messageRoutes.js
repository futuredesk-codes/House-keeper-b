import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { listMessages, sendMessage, markRead } from '../controllers/messageController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('message:view'), listMessages);
router.post('/', requirePermission('message:send'), sendMessage);
router.patch('/:id/read', requirePermission('message:view'), markRead);

export default router;
