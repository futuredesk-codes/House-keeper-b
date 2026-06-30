import { Router } from 'express';
import fs from 'fs';
import { verifySignature, localPathFor } from '../services/storage.js';
import ApiError from '../utils/ApiError.js';

const router = Router();

// GET /api/files/:key?expires=..&signature=..
// Sensitive documents are served ONLY through valid short-lived signed URLs (spec 12.2).
router.get('/:key', (req, res, next) => {
  const storageKey = decodeURIComponent(req.params.key);
  const { expires, signature } = req.query;

  if (!verifySignature(storageKey, expires, signature)) {
    return next(ApiError.forbidden('Invalid or expired file URL'));
  }

  const filePath = localPathFor(storageKey);
  if (!fs.existsSync(filePath)) return next(ApiError.notFound('File not found'));

  return res.sendFile(filePath);
});

export default router;
