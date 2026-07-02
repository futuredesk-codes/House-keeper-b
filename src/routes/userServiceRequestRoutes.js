import { Router } from 'express';
import { authenticateUser } from '../middleware/userAuth.js';
import {
  submitSellingProperty,
  submitEncroachmentCheck,
  submitPoaAssistance,
  submitForeignRemittance,
  submitRevenuePaperCheck,
  submitAncestralProperty,
  submitDocumentProcurement,
  submitKpSaleSupport,
} from '../controllers/serviceRequestController.js';

const router = Router();

// All service request submission endpoints require a logged-in app user.
router.use(authenticateUser);

// ── 8 service-specific submission endpoints ──────────────────────────────────
router.post('/selling-property',    submitSellingProperty);
router.post('/encroachment-check',  submitEncroachmentCheck);
router.post('/poa-assistance',      submitPoaAssistance);
router.post('/foreign-remittance',  submitForeignRemittance);
router.post('/revenue-paper-check', submitRevenuePaperCheck);
router.post('/ancestral-property',  submitAncestralProperty);
router.post('/document-procurement',submitDocumentProcurement);
router.post('/kp-sale-support',     submitKpSaleSupport);

export default router;
