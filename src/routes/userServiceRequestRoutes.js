import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import { uploadServiceDocument, uploadDocument } from '../controllers/serviceRequestController.js';

const router = Router();

// All service request endpoints require a logged-in app user.
router.use(authenticateUser);

// Document upload (returns public Cloudinary URL) — used generically by
// file/image/video fields in a service's dynamic formSchema.
router.post('/upload-document', uploadServiceDocument.single('file'), uploadDocument);

export default router;
