import mongoose from 'mongoose';
import FieldReport from '../models/FieldReport.js';
import Case from '../models/Case.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import { hasPermission, PERMISSIONS } from '../constants/roles.js';
import { REPORT_APPROVAL_STATUSES, RISK_RATINGS } from '../constants/statuses.js';

function publicReport(r) {
  return {
    id: r._id,
    caseId: r.caseId,
    agentId: r.agentId,
    visitDate: r.visitDate,
    purpose: r.purpose,
    summary: r.summary,
    boundaryStatus: r.boundaryStatus,
    accessStatus: r.accessStatus,
    geotags: r.geotags,
    photos: r.photos,
    videos: r.videos,
    notes: r.notes,
    riskRating: r.riskRating,
    approvalStatus: r.approvalStatus,
    approvedBy: r.approvedBy,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/field-reports
export const listFieldReports = asyncHandler(async (req, res) => {
  const { caseId, agentId, approvalStatus } = req.query;
  const filter = {};

  if (caseId) { assertValidId(caseId, 'caseId'); filter.caseId = caseId; }
  if (agentId) { assertValidId(agentId, 'agentId'); filter.agentId = agentId; }
  if (approvalStatus) {
    if (!REPORT_APPROVAL_STATUSES.includes(approvalStatus)) throw ApiError.badRequest('Invalid approvalStatus');
    filter.approvalStatus = approvalStatus;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    FieldReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    FieldReport.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicReport), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/field-reports/:id
export const getFieldReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const report = await FieldReport.findById(req.params.id)
    .populate('agentId', 'name')
    .populate('approvedBy', 'name');
  if (!report) throw ApiError.notFound('Field report not found');
  res.json(publicReport(report));
});

// POST /api/field-reports
export const createFieldReport = asyncHandler(async (req, res) => {
  const { caseId, visitDate, purpose, summary, boundaryStatus, accessStatus, geotags, photos, videos, notes, riskRating } = req.body;
  if (!caseId) throw ApiError.badRequest('caseId is required');
  assertValidId(caseId, 'caseId');
  if (riskRating !== undefined && !RISK_RATINGS.includes(riskRating)) throw ApiError.badRequest('Invalid riskRating');

  const report = await FieldReport.create({
    caseId,
    agentId: req.actor.id,
    visitDate: visitDate ? new Date(visitDate) : undefined,
    purpose,
    summary,
    boundaryStatus,
    accessStatus,
    geotags: geotags || [],
    photos: photos || [],
    videos: videos || [],
    notes,
    riskRating,
    approvalStatus: 'draft',
  });

  res.status(201).json(publicReport(report));
});

// PATCH /api/field-reports/:id  (draft edits by owner)
export const updateFieldReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const report = await FieldReport.findById(req.params.id);
  if (!report) throw ApiError.notFound('Field report not found');

  const canPublish = hasPermission(req.actor.permissions, PERMISSIONS.FIELD_PUBLISH_REPORT);
  const isOwner = String(report.agentId) === String(req.actor.id);

  if (!isOwner && !canPublish) throw ApiError.forbidden('You can only edit your own field reports');
  if (report.approvalStatus !== 'draft' && !canPublish) {
    throw ApiError.badRequest('Only draft reports can be edited');
  }

  const { visitDate, purpose, summary, boundaryStatus, accessStatus, geotags, photos, videos, notes, riskRating } = req.body;
  if (visitDate !== undefined) report.visitDate = visitDate ? new Date(visitDate) : undefined;
  if (purpose !== undefined) report.purpose = purpose;
  if (summary !== undefined) report.summary = summary;
  if (boundaryStatus !== undefined) report.boundaryStatus = boundaryStatus;
  if (accessStatus !== undefined) report.accessStatus = accessStatus;
  if (geotags !== undefined) report.geotags = geotags;
  if (photos !== undefined) report.photos = photos;
  if (videos !== undefined) report.videos = videos;
  if (notes !== undefined) report.notes = notes;
  if (riskRating !== undefined) {
    if (!RISK_RATINGS.includes(riskRating)) throw ApiError.badRequest('Invalid riskRating');
    report.riskRating = riskRating;
  }

  await report.save();
  res.json(publicReport(report));
});

// PATCH /api/field-reports/:id/review  (agent submits for review)
export const submitForReview = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const report = await FieldReport.findById(req.params.id);
  if (!report) throw ApiError.notFound('Field report not found');

  if (String(report.agentId) !== String(req.actor.id)) {
    throw ApiError.forbidden('Only the report author can submit for review');
  }
  if (report.approvalStatus !== 'draft') {
    throw ApiError.badRequest('Only draft reports can be submitted for review');
  }

  report.approvalStatus = 'under_review';
  await report.save();

  await logActivity({
    actor: req.actor,
    action: 'field_report.submit_review',
    entityType: 'FieldReport',
    entityId: report._id,
    ip: req.ip,
  });

  res.json(publicReport(report));
});

// PATCH /api/field-reports/:id/approve
export const approveFieldReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const report = await FieldReport.findById(req.params.id);
  if (!report) throw ApiError.notFound('Field report not found');

  report.approvalStatus = 'approved';
  report.approvedBy = req.actor.id;
  await report.save();

  await logActivity({
    actor: req.actor,
    action: 'field_report.approve',
    entityType: 'FieldReport',
    entityId: report._id,
    ip: req.ip,
  });

  res.json(publicReport(report));
});

// PATCH /api/field-reports/:id/reject
export const rejectFieldReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const report = await FieldReport.findById(req.params.id);
  if (!report) throw ApiError.notFound('Field report not found');

  report.approvalStatus = 'rejected';
  await report.save();

  await logActivity({
    actor: req.actor,
    action: 'field_report.reject',
    entityType: 'FieldReport',
    entityId: report._id,
    ip: req.ip,
  });

  res.json(publicReport(report));
});

// PATCH /api/field-reports/:id/publish
export const publishFieldReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const report = await FieldReport.findById(req.params.id);
  if (!report) throw ApiError.notFound('Field report not found');

  report.approvalStatus = 'published';
  report.publishedAt = new Date();
  await report.save();

  // Link this report to the case
  await Case.findByIdAndUpdate(report.caseId, {
    $addToSet: { reports: report._id },
  });

  await logActivity({
    actor: req.actor,
    action: 'field_report.publish',
    entityType: 'FieldReport',
    entityId: report._id,
    ip: req.ip,
  });

  res.json(publicReport(report));
});
