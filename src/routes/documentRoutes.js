import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/rbac.js';
import {
  listDocuments, getDocumentUrl, uploadDocument, updateDocument, deleteDocument,
  upload,
} from '../controllers/documentController.js';

const router = Router();

router.use(authenticate);

// /upload before /:id
router.get('/', requirePermission('document:view'), listDocuments);
router.post('/upload', requirePermission('document:upload'), upload.single('file'), uploadDocument);
router.get('/:id/url', requirePermission('document:view'), getDocumentUrl);
router.patch('/:id', requireAnyPermission('document:upload', 'document:verify'), updateDocument);
router.delete('/:id', requirePermission('record:delete'), deleteDocument);

export default router;
