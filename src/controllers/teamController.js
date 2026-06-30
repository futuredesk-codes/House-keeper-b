import mongoose from 'mongoose';
import TeamMember from '../models/TeamMember.js';
import Enquiry from '../models/Enquiry.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import { ROLES, ROLE_LABELS, PERMISSIONS } from '../constants/roles.js';
import { ACCOUNT_STATUSES } from '../constants/statuses.js';

function publicTeamMember(m) {
  return {
    id: m._id,
    name: m.name,
    email: m.email,
    role: m.role,
    roleLabel: ROLE_LABELS[m.role] || m.role,
    permissions: m.permissions,
    status: m.status,
    workload: m.workload,
    rating: m.rating,
    lastLoginAt: m.lastLoginAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid id');
}

// GET /api/team
export const listTeamMembers = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;
  const filter = {};

  if (role) {
    if (!Object.values(ROLES).includes(role)) throw ApiError.badRequest('Invalid role');
    filter.role = role;
  }
  if (status) {
    if (!ACCOUNT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter.status = status;
  }
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    TeamMember.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    TeamMember.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicTeamMember), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/team/:id
export const getTeamMember = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');
  res.json(publicTeamMember(member));
});

// POST /api/team
export const createTeamMember = asyncHandler(async (req, res) => {
  const { name, email, role, password, permissions, workload } = req.body;

  if (!name || !email || !role || !password) {
    throw ApiError.badRequest('name, email, role and password are required');
  }
  if (!Object.values(ROLES).includes(role)) throw ApiError.badRequest('Invalid role');
  if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
  if (permissions !== undefined) {
    if (!Array.isArray(permissions) || !permissions.every((p) => p === '*' || Object.values(PERMISSIONS).includes(p))) {
      throw ApiError.badRequest('Invalid permissions');
    }
  }

  const existing = await TeamMember.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('A team member with this email already exists');

  const member = new TeamMember({
    name,
    email: email.toLowerCase(),
    role,
    workload: workload ?? 0,
    ...(permissions !== undefined ? { permissions } : {}),
  });
  await member.setPassword(password);
  await member.save();

  await logActivity({
    actor: req.actor,
    action: 'team.create',
    entityType: 'TeamMember',
    entityId: member._id,
    after: publicTeamMember(member),
    ip: req.ip,
  });

  res.status(201).json(publicTeamMember(member));
});

// PATCH /api/team/:id
export const updateTeamMember = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  const { name, role, permissions, status, workload, rating } = req.body;

  if (role !== undefined && !Object.values(ROLES).includes(role)) throw ApiError.badRequest('Invalid role');
  if (status !== undefined && !ACCOUNT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
  if (permissions !== undefined) {
    if (!Array.isArray(permissions) || !permissions.every((p) => p === '*' || Object.values(PERMISSIONS).includes(p))) {
      throw ApiError.badRequest('Invalid permissions');
    }
  }

  const before = publicTeamMember(member);
  const statusChanging = status !== undefined && status !== member.status;

  if (name !== undefined) member.name = name;
  if (role !== undefined) member.role = role;
  if (permissions !== undefined) member.permissions = permissions;
  if (status !== undefined) member.status = status;
  if (workload !== undefined) member.workload = workload;
  if (rating !== undefined) member.rating = rating;

  await member.save();

  await logActivity({
    actor: req.actor,
    action: statusChanging ? 'team.status_change' : 'team.update',
    entityType: 'TeamMember',
    entityId: member._id,
    before,
    after: publicTeamMember(member),
    ip: req.ip,
  });

  res.json(publicTeamMember(member));
});

// PATCH /api/team/:id/deactivate
export const deactivateTeamMember = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  if (String(req.params.id) === String(req.actor.id)) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  const before = { status: member.status };
  member.status = 'blocked';
  member.refreshTokenHash = undefined;
  await member.save();

  await logActivity({
    actor: req.actor,
    action: 'team.deactivate',
    entityType: 'TeamMember',
    entityId: member._id,
    before,
    after: { status: member.status },
    ip: req.ip,
  });

  res.json(publicTeamMember(member));
});

// PATCH /api/team/:id/reactivate
export const reactivateTeamMember = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  const before = { status: member.status };
  member.status = 'active';
  await member.save();

  await logActivity({
    actor: req.actor,
    action: 'team.reactivate',
    entityType: 'TeamMember',
    entityId: member._id,
    before,
    after: { status: member.status },
    ip: req.ip,
  });

  res.json(publicTeamMember(member));
});

// DELETE /api/team/:id
export const hardDeleteTeamMember = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  if (String(req.params.id) === String(req.actor.id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw ApiError.notFound('Team member not found');

  const stillAssigned = await Enquiry.countDocuments({ assignedTo: member._id });
  if (stillAssigned > 0) {
    throw ApiError.conflict('This team member still has assigned enquiries. Reassign or deactivate instead.');
  }

  const before = publicTeamMember(member);
  await TeamMember.findByIdAndDelete(member._id);

  await logActivity({
    actor: req.actor,
    action: 'team.hard_delete',
    entityType: 'TeamMember',
    entityId: member._id,
    before,
    after: null,
    ip: req.ip,
  });

  res.json({ success: true });
});
