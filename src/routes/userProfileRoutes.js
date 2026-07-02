import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import { getProfile, updateProfile } from '../controllers/userProfileController.js';

const router = Router();

router.use(authenticateUser);

router.get('/', getProfile);
router.patch('/', updateProfile);

export default router;
