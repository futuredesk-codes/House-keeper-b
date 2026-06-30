import { Router } from 'express';
import authRoutes from './authRoutes.js';
import fileRoutes from './fileRoutes.js';
import teamRoutes from './teamRoutes.js';
import auditRoutes from './auditRoutes.js';
import enquiryRoutes from './enquiryRoutes.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'houseker-api' }));

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/team', teamRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/enquiries', enquiryRoutes);

// Phase 1 placeholder: a guarded "who am I" surface the admin uses to confirm the
// session + permissions wiring. Module routers (enquiries, cases, ...) land in later phases.
router.get('/session', authenticate, (req, res) => res.json({ actor: req.actor }));

export default router;
