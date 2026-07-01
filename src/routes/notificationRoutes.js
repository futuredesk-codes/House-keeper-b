import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  listNotifications, unreadCount, markRead, readAll, broadcast,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

// Fixed paths before /:id
router.get('/unread-count', requirePermission('notification:view'), unreadCount);
router.get('/', requirePermission('notification:view'), listNotifications);
router.patch('/:id/read', requirePermission('notification:view'), markRead);
router.post('/read-all', requirePermission('notification:view'), readAll);
router.post('/broadcast', requirePermission('notification:send'), broadcast);

export default router;
