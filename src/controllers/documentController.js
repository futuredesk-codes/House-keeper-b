import mongoose from 'mongoose';
import multer from 'multer';
import Document from '../models/Document.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import {
  generateStorageKey, saveBuffer, deleteObject, getSignedUrl,
} from '../services/storage.js';
import {
  DOCUMENT_STATUSES, DOCUMENT_CATEGORIES, DOCUMENT_VISIBILITY,
} from '../constants/statuses.js';

export const upload = multer({ storage: multer.memoryStorage() });

function publicDocument(d) {
  return {
    id: d._id,
    ownerUserId: d.ownerUserId,
    caseId: d.caseId,
    enquiryId: d.enquiryId,
    propertyId: d.propertyId,
    category: d.category,
    originalName: d.originalName,
    mimeType: d.mimeType,
    size: d.size,
    // storageKey intentionally omitted — access via /api/documents/:id/url
    status: d.status,
    uploadedBy: d.uploadedBy,
    visibility: d.visibility,
    sharingDisabled: d.sharingDisabled,
    remarks: d.remarks,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/documents
export const listDocuments = asyncHandler(async (req, res) => {
  const { caseId, userId, enquiryId, category, status } = req.query;
  const filter = {};

  if (caseId) { assertValidId(caseId, 'caseId'); filter.caseId = caseId; }
  if (userId) { assertValidId(userId, 'userId'); filter.ownerUserId = userId; }
  if (enquiryId) { assertValidId(enquiryId, 'enquiryId'); filter.enquiryId = enquiryId; }
  if (category) {
    if (!DOCUMENT_CATEGORIES.includes(category)) throw ApiError.badRequest('Invalid category');
    filter.category = category;
  }
  if (status) {
    if (!DOCUMENT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter.status = status;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Document.find(filter).populate('ownerUserId', 'name phone email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Document.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicDocument), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/documents/:id/url
export const getDocumentUrl = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document not found');

  const url = getSignedUrl(doc.storageKey);
  res.json({ url });
});

// POST /api/documents/upload
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');

  const { caseId, userId, enquiryId, propertyId, category, visibility } = req.body;

  if (caseId) assertValidId(caseId, 'caseId');
  if (userId) assertValidId(userId, 'userId');
  if (enquiryId) assertValidId(enquiryId, 'enquiryId');
  if (propertyId) assertValidId(propertyId, 'propertyId');
  if (category && !DOCUMENT_CATEGORIES.includes(category)) throw ApiError.badRequest('Invalid category');
  if (visibility && !DOCUMENT_VISIBILITY.includes(visibility)) throw ApiError.badRequest('Invalid visibility');

  const storageKey = generateStorageKey(req.file.originalname);
  await saveBuffer(storageKey, req.file.buffer);

  const doc = await Document.create({
    ownerUserId: userId || undefined,
    caseId: caseId || undefined,
    enquiryId: enquiryId || undefined,
    propertyId: propertyId || undefined,
    category: category || 'other',
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageKey,
    uploadedBy: { id: req.actor.id, role: 'team' },
    visibility: visibility || 'private',
  });

  await logActivity({
    actor: req.actor,
    action: 'document.upload',
    entityType: 'Document',
    entityId: doc._id,
    after: { originalName: doc.originalName, category: doc.category, caseId, userId },
    ip: req.ip,
  });

  res.status(201).json(publicDocument(doc));
});

// PATCH /api/documents/:id
export const updateDocument = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document not found');

  const { status, visibility, remarks, sharingDisabled } = req.body;

  if (status !== undefined) {
    if (!DOCUMENT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    doc.status = status;
  }
  if (visibility !== undefined) {
    if (!DOCUMENT_VISIBILITY.includes(visibility)) throw ApiError.badRequest('Invalid visibility');
    doc.visibility = visibility;
  }
  if (remarks !== undefined) doc.remarks = remarks;
  if (sharingDisabled !== undefined) doc.sharingDisabled = !!sharingDisabled;

  await doc.save();

  await logActivity({
    actor: req.actor,
    action: 'document.update',
    entityType: 'Document',
    entityId: doc._id,
    after: { status, visibility, remarks, sharingDisabled },
    ip: req.ip,
  });

  res.json(publicDocument(doc));
});

// DELETE /api/documents/:id
export const deleteDocument = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document not found');

  await deleteObject(doc.storageKey);
  await Document.findByIdAndDelete(doc._id);

  await logActivity({
    actor: req.actor,
    action: 'document.delete',
    entityType: 'Document',
    entityId: doc._id,
    before: { originalName: doc.originalName, storageKey: '[redacted]' },
    ip: req.ip,
  });

  res.status(204).end();
});
