import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userAuthRoutes from './userAuthRoutes.js';
import fileRoutes from './fileRoutes.js';
import teamRoutes from './teamRoutes.js';
import auditRoutes from './auditRoutes.js';
import enquiryRoutes from './enquiryRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import userRoutes from './userRoutes.js';
import propertyRoutes from './propertyRoutes.js';
import caseRoutes from './caseRoutes.js';
import documentRoutes from './documentRoutes.js';
import fieldReportRoutes from './fieldReportRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import messageRoutes from './messageRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import projectRoutes from './projectRoutes.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'houseker-api' }));

router.use('/auth', authRoutes);
router.use('/user-auth', userAuthRoutes);
router.use('/files', fileRoutes);
router.use('/team', teamRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/services', serviceRoutes);
router.use('/users', userRoutes);
router.use('/properties', propertyRoutes);
router.use('/cases', caseRoutes);
router.use('/documents', documentRoutes);
router.use('/field-reports', fieldReportRoutes);
router.use('/payments', paymentRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/projects', projectRoutes);

router.get('/session', authenticate, (req, res) => res.json({ actor: req.actor }));

export default router;
