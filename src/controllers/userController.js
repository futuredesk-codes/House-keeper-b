import mongoose from 'mongoose';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import { USER_TYPES, KYC_STATUSES, ACCOUNT_STATUSES } from '../constants/statuses.js';

function publicUser(u) {
  return {
    id: u._id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    userType: u.userType,
    country: u.country,
    language: u.language,
    kycStatus: u.kycStatus,
    status: u.status,
    internalNotes: u.internalNotes,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/users/stats
export const userStats = asyncHandler(async (req, res) => {
  const [total, byType, byKyc] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$kycStatus', count: { $sum: 1 } } }]),
  ]);

  res.json({
    total,
    byType: Object.fromEntries(byType.map((x) => [x._id, x.count])),
    byKyc: Object.fromEntries(byKyc.map((x) => [x._id, x.count])),
  });
});

// GET /api/users
export const listUsers = asyncHandler(async (req, res) => {
  const { userType, status, kycStatus, search } = req.query;
  const filter = {};

  if (userType) {
    if (!USER_TYPES.includes(userType)) throw ApiError.badRequest('Invalid userType');
    filter.userType = userType;
  }
  if (status) {
    if (!ACCOUNT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter.status = status;
  }
  if (kycStatus) {
    if (!KYC_STATUSES.includes(kycStatus)) throw ApiError.badRequest('Invalid kycStatus');
    filter.kycStatus = kycStatus;
  }
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicUser), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/users/:id
export const getUser = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const user = await User.findById(req.params.id)
    .populate('internalNotes.authorId', 'name');
  if (!user) throw ApiError.notFound('User not found');
  res.json(publicUser(user));
});

// POST /api/users
export const createUser = asyncHandler(async (req, res) => {
  const { name, phone, email, userType, country, language } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Name is required');
  if (!phone && !email) throw ApiError.badRequest('Phone or email is required');
  if (userType !== undefined && !USER_TYPES.includes(userType)) throw ApiError.badRequest('Invalid userType');

  const user = await User.create({
    name: name.trim(),
    phone: phone || undefined,
    email: email || undefined,
    userType: userType || 'guest',
    country,
    language,
  });

  await logActivity({
    actor: req.actor,
    action: 'user.create',
    entityType: 'User',
    entityId: user._id,
    after: publicUser(user),
    ip: req.ip,
  });

  res.status(201).json(publicUser(user));
});

// PATCH /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, phone, email, userType, country, language } = req.body;
  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone;
  if (email !== undefined) user.email = email;
  if (userType !== undefined) {
    if (!USER_TYPES.includes(userType)) throw ApiError.badRequest('Invalid userType');
    user.userType = userType;
  }
  if (country !== undefined) user.country = country;
  if (language !== undefined) user.language = language;

  await user.save();

  await logActivity({
    actor: req.actor,
    action: 'user.update',
    entityType: 'User',
    entityId: user._id,
    after: { name, phone, email, userType, country, language },
    ip: req.ip,
  });

  res.json(publicUser(user));
});

// PATCH /api/users/:id/kyc
export const updateKyc = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { kycStatus } = req.body;
  if (!kycStatus || !KYC_STATUSES.includes(kycStatus)) throw ApiError.badRequest('Invalid kycStatus');

  const before = { kycStatus: user.kycStatus };
  user.kycStatus = kycStatus;
  await user.save();

  await logActivity({
    actor: req.actor,
    action: 'user.kyc_update',
    entityType: 'User',
    entityId: user._id,
    before,
    after: { kycStatus },
    ip: req.ip,
  });

  res.json(publicUser(user));
});

// PATCH /api/users/:id/block
export const blockUser = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.status === 'blocked') throw ApiError.badRequest('User is already blocked');

  user.status = 'blocked';
  await user.save();

  await logActivity({
    actor: req.actor,
    action: 'user.block',
    entityType: 'User',
    entityId: user._id,
    before: { status: 'active' },
    after: { status: 'blocked' },
    ip: req.ip,
  });

  res.json(publicUser(user));
});

// PATCH /api/users/:id/unblock
export const unblockUser = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.status !== 'blocked') throw ApiError.badRequest('User is not blocked');

  user.status = 'active';
  await user.save();

  await logActivity({
    actor: req.actor,
    action: 'user.unblock',
    entityType: 'User',
    entityId: user._id,
    before: { status: 'blocked' },
    after: { status: 'active' },
    ip: req.ip,
  });

  res.json(publicUser(user));
});

// POST /api/users/:id/notes
export const addUserNote = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { body } = req.body;
  if (!body || !body.trim()) throw ApiError.badRequest('Note body is required');

  user.internalNotes.push({ body: body.trim(), authorId: req.actor.id });
  await user.save();

  res.json(publicUser(user));
});
