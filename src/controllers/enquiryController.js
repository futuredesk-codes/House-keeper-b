import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import User from '../models/User.js';
import TeamMember from '../models/TeamMember.js';
import Case from '../models/Case.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import { hasPermission, PERMISSIONS } from '../constants/roles.js';
import {
  ENQUIRY_TYPES, ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_STATUS_TRANSITIONS, PRIORITIES, USER_TYPES,
} from '../constants/statuses.js';

const CLOSED_STATUSES = ['converted', 'closed_not_interested', 'closed_duplicate', 'spam_invalid'];

function publicEnquiry(e) {
  return {
    id: e._id,
    enquiryId: e.enquiryId,
    type: e.type,
    source: e.source,
    sourceModule: e.sourceModule,
    sourceScreen: e.sourceScreen,
    campaign: e.campaign,
    userId: e.userId,
    guestInfo: e.guestInfo,
    userType: e.userType,
    serviceId: e.serviceId,
    projectId: e.projectId,
    serviceName: e.serviceName,
    location: e.location,
    status: e.status,
    priority: e.priority,
    assignedTo: e.assignedTo,
    followUpAt: e.followUpAt,
    submittedData: e.submittedData,
    documents: e.documents,
    linkedCaseId: e.linkedCaseId,
    linkedProjectLeadId: e.linkedProjectLeadId,
    linkedJDId: e.linkedJDId,
    duplicateOf: e.duplicateOf,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

function canViewAll(actor) {
  return hasPermission(actor.permissions, PERMISSIONS.ENQUIRY_VIEW_ALL);
}

// Throws 403 if the actor cannot view this specific enquiry doc.
// enquiry.assignedTo may be a raw ObjectId or a populated TeamMember doc
// depending on the caller, so unwrap ._id when present.
function assertCanAccess(actor, enquiry) {
  if (canViewAll(actor)) return;
  const assignedId = enquiry.assignedTo && enquiry.assignedTo._id ? enquiry.assignedTo._id : enquiry.assignedTo;
  if (!assignedId || String(assignedId) !== String(actor.id)) {
    throw ApiError.forbidden('You do not have access to this enquiry');
  }
}

const DETAIL_POPULATE = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'userId', select: 'name phone email' },
  { path: 'serviceId', select: 'name' },
  { path: 'projectId', select: 'name' },
  { path: 'notes.authorId', select: 'name' },
];

// GET /api/enquiries/stats
export const enquiryStats = asyncHandler(async (req, res) => {
  const filter = {};
  if (!canViewAll(req.actor)) filter.assignedTo = req.actor.id;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [newEnquiriesToday, pendingFollowUps] = await Promise.all([
    Enquiry.countDocuments({ ...filter, status: 'new', createdAt: { $gte: startOfToday } }),
    Enquiry.countDocuments({
      ...filter,
      followUpAt: { $lte: new Date() },
      status: { $nin: CLOSED_STATUSES },
    }),
  ]);

  res.json({ newEnquiriesToday, pendingFollowUps });
});

// GET /api/enquiries
export const listEnquiries = asyncHandler(async (req, res) => {
  const {
    status, priority, assignedTo, type, dateFrom, dateTo, followUpBefore, search,
  } = req.query;
  const filter = {};

  if (status) {
    if (!ENQUIRY_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter.status = status;
  }
  if (priority) {
    if (!PRIORITIES.includes(priority)) throw ApiError.badRequest('Invalid priority');
    filter.priority = priority;
  }
  if (type) {
    if (!ENQUIRY_TYPES.includes(type)) throw ApiError.badRequest('Invalid type');
    filter.type = type;
  }
  if (assignedTo) {
    assertValidId(assignedTo, 'assignedTo');
    filter.assignedTo = assignedTo;
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  if (followUpBefore) {
    const before = new Date(followUpBefore);
    if (Number.isNaN(before.getTime())) throw ApiError.badRequest('Invalid followUpBefore');
    filter.followUpAt = { $lte: before };
  }
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [
      { enquiryId: re },
      { serviceName: re },
      { 'guestInfo.name': re },
      { 'guestInfo.phone': re },
      { 'guestInfo.email': re },
    ];
  }

  // Assigned-only actors can never see beyond their own assignments, regardless
  // of any assignedTo filter they might pass.
  if (!canViewAll(req.actor)) filter.assignedTo = req.actor.id;

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Enquiry.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicEnquiry), meta: buildPageMeta({ page, limit, total }) });
});

// POST /api/enquiries
export const createEnquiry = asyncHandler(async (req, res) => {
  const {
    type, source, sourceModule, sourceScreen, campaign, userId, guestInfo, userType,
    serviceId, projectId, serviceName, location, priority, submittedData, documents,
  } = req.body;

  if (!type || !ENQUIRY_TYPES.includes(type)) throw ApiError.badRequest('A valid type is required');
  if (!source || !ENQUIRY_SOURCES.includes(source)) throw ApiError.badRequest('A valid source is required');

  const hasUser = !!userId;
  const hasGuest = !!(guestInfo && guestInfo.name && (guestInfo.phone || guestInfo.email));
  if (!hasUser && !hasGuest) {
    throw ApiError.badRequest('Either userId or guestInfo (name + phone/email) is required');
  }

  if (hasUser) {
    assertValidId(userId, 'userId');
    const user = await User.findById(userId);
    if (!user) throw ApiError.badRequest('User not found');
  }
  if (userType !== undefined && !USER_TYPES.includes(userType)) throw ApiError.badRequest('Invalid userType');
  if (priority !== undefined && !PRIORITIES.includes(priority)) throw ApiError.badRequest('Invalid priority');
  if (serviceId !== undefined) assertValidId(serviceId, 'serviceId');
  if (projectId !== undefined) assertValidId(projectId, 'projectId');

  const enquiry = await Enquiry.create({
    type,
    source,
    sourceModule,
    sourceScreen,
    campaign,
    userId: hasUser ? userId : undefined,
    guestInfo: hasGuest ? guestInfo : undefined,
    ...(userType !== undefined ? { userType } : {}),
    serviceId,
    projectId,
    serviceName,
    location,
    ...(priority !== undefined ? { priority } : {}),
    submittedData,
    documents,
  });

  await logActivity({
    actor: req.actor,
    action: 'enquiry.create',
    entityType: 'Enquiry',
    entityId: enquiry._id,
    after: publicEnquiry(enquiry),
    ip: req.ip,
  });

  res.status(201).json(publicEnquiry(enquiry));
});

// GET /api/enquiries/:id
export const getEnquiry = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const enquiry = await Enquiry.findById(req.params.id).populate(DETAIL_POPULATE);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  assertCanAccess(req.actor, enquiry);

  res.json(publicEnquiry(enquiry));
});

// PATCH /api/enquiries/:id
export const updateEnquiry = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  assertCanAccess(req.actor, enquiry);

  const { status, priority, followUpAt, serviceName, location, submittedData } = req.body;

  let statusChanged = false;
  let statusBefore;

  if (status !== undefined && status !== enquiry.status) {
    if (status === 'converted') {
      throw ApiError.badRequest('Use the convert endpoint to move an enquiry to "converted"');
    }
    if (!ENQUIRY_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    const allowed = ENQUIRY_STATUS_TRANSITIONS[enquiry.status] || [];
    if (!allowed.includes(status)) {
      throw ApiError.badRequest(`Cannot move enquiry from "${enquiry.status}" to "${status}"`);
    }
    statusBefore = enquiry.status;
    enquiry.status = status;
    statusChanged = true;
  }

  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) throw ApiError.badRequest('Invalid priority');
    enquiry.priority = priority;
  }
  if (followUpAt !== undefined) {
    const parsed = followUpAt === null ? null : new Date(followUpAt);
    if (parsed !== null && Number.isNaN(parsed.getTime())) throw ApiError.badRequest('Invalid followUpAt');
    enquiry.followUpAt = parsed;
  }
  if (serviceName !== undefined) enquiry.serviceName = serviceName;
  if (location !== undefined) enquiry.location = location;
  if (submittedData !== undefined) enquiry.submittedData = submittedData;

  await enquiry.save();

  if (statusChanged) {
    await logActivity({
      actor: req.actor,
      action: 'enquiry.status_change',
      entityType: 'Enquiry',
      entityId: enquiry._id,
      before: { status: statusBefore },
      after: { status: enquiry.status },
      ip: req.ip,
    });
  } else {
    await logActivity({
      actor: req.actor,
      action: 'enquiry.update',
      entityType: 'Enquiry',
      entityId: enquiry._id,
      after: { priority, followUpAt, serviceName, location, submittedData },
      ip: req.ip,
    });
  }

  res.json(publicEnquiry(enquiry));
});

// PATCH /api/enquiries/:id/assign
export const assignEnquiry = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  const { assignedTo } = req.body;
  if (assignedTo !== null && assignedTo !== undefined) {
    assertValidId(assignedTo, 'assignedTo');
    const member = await TeamMember.findById(assignedTo);
    if (!member || member.status !== 'active') {
      throw ApiError.badRequest('assignedTo must reference an active team member');
    }
  }

  const before = { assignedTo: enquiry.assignedTo, status: enquiry.status };
  enquiry.assignedTo = assignedTo || undefined;

  if (enquiry.status === 'new' && assignedTo) {
    enquiry.status = 'assigned';
  }

  await enquiry.save();

  await logActivity({
    actor: req.actor,
    action: 'enquiry.assign',
    entityType: 'Enquiry',
    entityId: enquiry._id,
    before,
    after: { assignedTo: enquiry.assignedTo, status: enquiry.status },
    ip: req.ip,
  });

  res.json(publicEnquiry(enquiry));
});

// POST /api/enquiries/:id/notes
export const addEnquiryNote = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  assertCanAccess(req.actor, enquiry);

  const { body, mentions, important } = req.body;
  if (!body || typeof body !== 'string' || !body.trim()) {
    throw ApiError.badRequest('Note body is required');
  }
  if (mentions !== undefined) {
    if (!Array.isArray(mentions) || !mentions.every((m) => mongoose.Types.ObjectId.isValid(m))) {
      throw ApiError.badRequest('Invalid mentions');
    }
  }

  const note = {
    body: body.trim(),
    authorId: req.actor.id,
    mentions: mentions || [],
    important: !!important,
  };
  enquiry.notes.push(note);
  await enquiry.save();

  await logActivity({
    actor: req.actor,
    action: 'enquiry.note_add',
    entityType: 'Enquiry',
    entityId: enquiry._id,
    after: note,
    ip: req.ip,
  });

  res.json(publicEnquiry(enquiry));
});

// PATCH /api/enquiries/:id/convert
export const convertEnquiry = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  if (enquiry.linkedCaseId) throw ApiError.conflict('Enquiry has already been converted');

  const allowed = ENQUIRY_STATUS_TRANSITIONS[enquiry.status] || [];
  if (!allowed.includes('converted')) {
    throw ApiError.badRequest(`Cannot convert an enquiry from status "${enquiry.status}"`);
  }

  const { propertyId, dueDate, priority } = req.body || {};
  if (propertyId !== undefined) assertValidId(propertyId, 'propertyId');
  if (priority !== undefined && !PRIORITIES.includes(priority)) throw ApiError.badRequest('Invalid priority');
  let parsedDueDate;
  if (dueDate !== undefined) {
    parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) throw ApiError.badRequest('Invalid dueDate');
  }

  const newCase = await Case.create({
    enquiryId: enquiry._id,
    userId: enquiry.userId,
    serviceId: enquiry.serviceId,
    serviceType: enquiry.serviceName,
    propertyId,
    priority: priority || enquiry.priority,
    dueDate: parsedDueDate,
    documents: enquiry.documents,
    assignedTeam: enquiry.assignedTo ? [enquiry.assignedTo] : [],
  });

  const statusBefore = enquiry.status;
  enquiry.status = 'converted';
  enquiry.linkedCaseId = newCase._id;
  await enquiry.save();

  await logActivity({
    actor: req.actor,
    action: 'enquiry.convert',
    entityType: 'Enquiry',
    entityId: enquiry._id,
    before: { status: statusBefore },
    after: { status: enquiry.status, linkedCaseId: newCase._id },
    ip: req.ip,
  });
  await logActivity({
    actor: req.actor,
    action: 'case.create_from_enquiry',
    entityType: 'Case',
    entityId: newCase._id,
    after: { caseId: newCase.caseId, enquiryId: enquiry._id },
    ip: req.ip,
  });

  res.json({
    enquiry: publicEnquiry(enquiry),
    case: { id: newCase._id, caseId: newCase.caseId, status: newCase.status },
  });
});
