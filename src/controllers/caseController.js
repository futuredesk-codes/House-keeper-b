import mongoose from 'mongoose';
import Case from '../models/Case.js';
import TeamMember from '../models/TeamMember.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import { createNotification } from '../services/notificationService.js';
import { hasPermission, PERMISSIONS } from '../constants/roles.js';
import { CASE_STATUSES, CASE_STATUS_TRANSITIONS, PRIORITIES, PAYMENT_STATUSES } from '../constants/statuses.js';

function publicCase(c) {
  return {
    id: c._id,
    caseId: c.caseId,
    enquiryId: c.enquiryId,
    userId: c.userId,
    serviceId: c.serviceId,
    serviceType: c.serviceType,
    propertyId: c.propertyId,
    status: c.status,
    priority: c.priority,
    milestones: c.milestones,
    assignedTeam: c.assignedTeam,
    documents: c.documents,
    reports: c.reports,
    paymentStatus: c.paymentStatus,
    dueDate: c.dueDate,
    internalNotes: c.internalNotes,
    lastActivityAt: c.lastActivityAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

function canViewAll(actor) {
  return hasPermission(actor.permissions, PERMISSIONS.CASE_VIEW_ALL);
}

function assertCanAccess(actor, cas) {
  if (canViewAll(actor)) return;
  const inTeam = (cas.assignedTeam || []).some((mid) => {
    const id = mid._id ? mid._id : mid;
    return String(id) === String(actor.id);
  });
  if (!inTeam) throw ApiError.forbidden('You do not have access to this case');
}

const DETAIL_POPULATE = [
  { path: 'assignedTeam', select: 'name role email' },
  { path: 'userId', select: 'name phone email' },
  { path: 'serviceId', select: 'name category' },
  { path: 'documents', select: 'originalName category status mimeType createdAt' },
  { path: 'reports', select: 'approvalStatus visitDate riskRating' },
  { path: 'internalNotes.authorId', select: 'name' },
];

// GET /api/cases/stats
export const caseStats = asyncHandler(async (req, res) => {
  const filter = {};
  if (!canViewAll(req.actor)) filter.assignedTeam = req.actor.id;

  const now = new Date();
  const [total, byStatus, overdueCount] = await Promise.all([
    Case.countDocuments(filter),
    Case.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Case.countDocuments({
      ...filter,
      dueDate: { $lt: now },
      status: { $nin: ['completed', 'cancelled', 'closed'] },
    }),
  ]);

  res.json({
    total,
    byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.count])),
    overdueCount,
  });
});

// GET /api/cases
export const listCases = asyncHandler(async (req, res) => {
  const { status, priority, serviceType, userId, assignedMember, dateFrom, dateTo } = req.query;
  const filter = {};

  if (status) {
    if (!CASE_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter.status = status;
  }
  if (priority) {
    if (!PRIORITIES.includes(priority)) throw ApiError.badRequest('Invalid priority');
    filter.priority = priority;
  }
  if (serviceType) filter.serviceType = new RegExp(serviceType.trim(), 'i');
  if (userId) {
    assertValidId(userId, 'userId');
    filter.userId = userId;
  }
  if (assignedMember) {
    assertValidId(assignedMember, 'assignedMember');
    filter.assignedTeam = assignedMember;
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  // Scoped actors can only see their assigned cases
  if (!canViewAll(req.actor)) filter.assignedTeam = req.actor.id;

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Case.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Case.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicCase), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/cases/:id
export const getCase = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const cas = await Case.findById(req.params.id).populate(DETAIL_POPULATE);
  if (!cas) throw ApiError.notFound('Case not found');

  assertCanAccess(req.actor, cas);

  res.json(publicCase(cas));
});

// PATCH /api/cases/:id
export const updateCase = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const cas = await Case.findById(req.params.id);
  if (!cas) throw ApiError.notFound('Case not found');

  assertCanAccess(req.actor, cas);

  const { status, priority, dueDate, paymentStatus, serviceType } = req.body;
  const before = { status: cas.status, priority: cas.priority, paymentStatus: cas.paymentStatus };

  if (status !== undefined && status !== cas.status) {
    if (!CASE_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    const allowed = CASE_STATUS_TRANSITIONS[cas.status] || [];
    if (!allowed.includes(status)) {
      throw ApiError.badRequest(`Cannot move case from "${cas.status}" to "${status}"`);
    }
    cas.status = status;
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) throw ApiError.badRequest('Invalid priority');
    cas.priority = priority;
  }
  if (dueDate !== undefined) {
    cas.dueDate = dueDate ? new Date(dueDate) : undefined;
  }
  if (paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) throw ApiError.badRequest('Invalid paymentStatus');
    cas.paymentStatus = paymentStatus;
  }
  if (serviceType !== undefined) cas.serviceType = serviceType;
  cas.lastActivityAt = new Date();

  await cas.save();

  await logActivity({
    actor: req.actor,
    action: 'case.update',
    entityType: 'Case',
    entityId: cas._id,
    before,
    after: { status: cas.status, priority: cas.priority, paymentStatus: cas.paymentStatus },
    ip: req.ip,
  });

  res.json(publicCase(cas));
});

// PATCH /api/cases/:id/assign
export const assignCase = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const cas = await Case.findById(req.params.id);
  if (!cas) throw ApiError.notFound('Case not found');

  const { add = [], remove = [] } = req.body;

  for (const id of [...add, ...remove]) {
    assertValidId(id, 'team member id');
  }

  if (add.length > 0) {
    const members = await TeamMember.find({ _id: { $in: add }, status: 'active' });
    if (members.length !== add.length) {
      throw ApiError.badRequest('One or more added members do not exist or are inactive');
    }
  }

  const before = { assignedTeam: [...cas.assignedTeam] };

  const addSet = new Set(add.map(String));
  const removeSet = new Set(remove.map(String));

  cas.assignedTeam = [
    ...cas.assignedTeam.filter((id) => !removeSet.has(String(id))),
    ...add.filter((id) => !cas.assignedTeam.some((e) => String(e) === String(id))),
  ];
  cas.lastActivityAt = new Date();

  await cas.save();

  // Fire notifications for newly added members
  for (const memberId of add) {
    createNotification({
      recipientType: 'team',
      teamMemberId: memberId,
      title: 'Case assigned to you',
      body: `You have been assigned to case ${cas.caseId}`,
      type: 'case_assign',
      relatedId: cas._id,
      relatedType: 'case',
    });
  }

  await logActivity({
    actor: req.actor,
    action: 'case.assign',
    entityType: 'Case',
    entityId: cas._id,
    before,
    after: { assignedTeam: cas.assignedTeam },
    ip: req.ip,
  });

  res.json(publicCase(cas));
});

// POST /api/cases/:id/milestones
export const addMilestone = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const cas = await Case.findById(req.params.id);
  if (!cas) throw ApiError.notFound('Case not found');

  const { label, order, expectedDate } = req.body;
  if (!label || !label.trim()) throw ApiError.badRequest('Milestone label is required');

  cas.milestones.push({
    label: label.trim(),
    order: order ?? cas.milestones.length,
    expectedDate: expectedDate ? new Date(expectedDate) : undefined,
  });
  cas.lastActivityAt = new Date();
  await cas.save();

  res.json(publicCase(cas));
});

// PATCH /api/cases/:id/milestones/:mid
export const updateMilestone = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const cas = await Case.findById(req.params.id);
  if (!cas) throw ApiError.notFound('Case not found');

  const milestone = cas.milestones.id(req.params.mid);
  if (!milestone) throw ApiError.notFound('Milestone not found');

  const { status, expectedDate, completedAt } = req.body;
  const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed'];
  if (status !== undefined) {
    if (!MILESTONE_STATUSES.includes(status)) throw ApiError.badRequest('Invalid milestone status');
    milestone.status = status;
  }
  if (expectedDate !== undefined) milestone.expectedDate = expectedDate ? new Date(expectedDate) : undefined;
  if (completedAt !== undefined) milestone.completedAt = completedAt ? new Date(completedAt) : undefined;

  cas.lastActivityAt = new Date();
  await cas.save();

  res.json(publicCase(cas));
});

// POST /api/cases/:id/notes
export const addCaseNote = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const cas = await Case.findById(req.params.id);
  if (!cas) throw ApiError.notFound('Case not found');

  assertCanAccess(req.actor, cas);

  const { body, mentions, important } = req.body;
  if (!body || !body.trim()) throw ApiError.badRequest('Note body is required');

  cas.internalNotes.push({
    body: body.trim(),
    authorId: req.actor.id,
    mentions: mentions || [],
    important: !!important,
  });
  cas.lastActivityAt = new Date();
  await cas.save();

  res.json(publicCase(cas));
});
