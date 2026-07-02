import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import { expressInterest } from '../controllers/projectController.js';

const router = Router();

router.use(authenticateUser);

// POST /api/user/projects/:id/interest
router.post('/:id/interest', expressInterest);

export default router;
