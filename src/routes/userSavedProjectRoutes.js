import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import { toggleSaveProject, listSavedProjects, getSavedProjectIds } from '../controllers/savedProjectController.js';

const router = Router();

router.use(authenticateUser);

// GET /api/user/saved-projects
router.get('/', listSavedProjects);
// GET /api/user/saved-projects/ids
router.get('/ids', getSavedProjectIds);
// POST /api/user/saved-projects/:projectId/toggle
router.post('/:projectId/toggle', toggleSaveProject);

export default router;
