import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

function publicLogEntry(l) {
  return {
    id: l._id,
    actorId: l.actorId,
    actorRole: l.actorRole,
    actorName: l.actorName,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    before: l.before,
    after: l.after,
    remarks: l.remarks,
    ip: l.ip,
    timestamp: l.timestamp,
  };
}

// GET /api/audit-logs
export const listActivityLogs = asyncHandler(async (req, res) => {
  const { entityType, entityId, actorId, action, dateFrom, dateTo } = req.query;
  const filter = {};

  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;

  if (entityId) {
    if (!mongoose.Types.ObjectId.isValid(entityId)) throw ApiError.badRequest('Invalid entityId');
    filter.entityId = entityId;
  }
  if (actorId) {
    if (!mongoose.Types.ObjectId.isValid(actorId)) throw ApiError.badRequest('Invalid actorId');
    filter.actorId = actorId;
  }

  if (dateFrom || dateTo) {
    filter.timestamp = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (Number.isNaN(from.getTime())) throw ApiError.badRequest('Invalid dateFrom');
      filter.timestamp.$gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (Number.isNaN(to.getTime())) throw ApiError.badRequest('Invalid dateTo');
      filter.timestamp.$lte = to;
    }
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicLogEntry), meta: buildPageMeta({ page, limit, total }) });
});
