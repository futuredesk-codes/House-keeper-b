import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import {
  listMyNotifications, myUnreadCount, markMyNotificationRead, readAllMyNotifications,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticateUser);

// Fixed paths before /:id
router.get('/unread-count', myUnreadCount);
router.get('/', listMyNotifications);
router.patch('/:id/read', markMyNotificationRead);
router.post('/read-all', readAllMyNotifications);

export default router;
