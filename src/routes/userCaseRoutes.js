import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import { createMyCase, listMyCases, getMyCase } from '../controllers/caseController.js';

const router = Router();

router.use(authenticateUser);

router.post('/', createMyCase);
router.get('/', listMyCases);
router.get('/:id', getMyCase);

export default router;
