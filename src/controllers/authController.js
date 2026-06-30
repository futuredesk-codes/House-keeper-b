import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import TeamMember from '../models/TeamMember.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
} from '../utils/jwt.js';
import { logActivity } from '../services/auditLog.js';
import { ROLE_LABELS } from '../constants/roles.js';

function publicMember(m) {
  return {
    id: m._id,
    name: m.name,
    email: m.email,
    role: m.role,
    roleLabel: ROLE_LABELS[m.role] || m.role,
    permissions: m.permissions,
    status: m.status,
    lastLoginAt: m.lastLoginAt,
  };
}

async function issueTokens(member) {
  const accessToken = signAccessToken({ sub: member._id.toString(), role: member.role });
  const refreshToken = signRefreshToken({ sub: member._id.toString() });
  member.refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  member.lastLoginAt = new Date();
  await member.save();
  return { accessToken, refreshToken };
}

// POST /api/auth/login  (admin/team email + password)
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const member = await TeamMember.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!member) throw ApiError.unauthorized('Invalid credentials');
  if (member.status !== 'active') throw ApiError.forbidden('Account is blocked');

  const ok = await member.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const tokens = await issueTokens(member);
  await logActivity({
    actor: { id: member._id, role: member.role, name: member.name },
    action: 'auth.login',
    entityType: 'TeamMember',
    entityId: member._id,
    ip: req.ip,
  });

  res.json({ ...tokens, member: publicMember(member) });
});

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('Refresh token required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const member = await TeamMember.findById(payload.sub).select('+refreshTokenHash');
  if (!member || member.status !== 'active') throw ApiError.unauthorized('Account not found');

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  if (member.refreshTokenHash !== hash) throw ApiError.unauthorized('Refresh token revoked');

  const tokens = await issueTokens(member);
  res.json({ ...tokens, member: publicMember(member) });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await TeamMember.findByIdAndUpdate(req.actor.id, { $unset: { refreshTokenHash: 1 } });
  await logActivity({
    actor: req.actor, action: 'auth.logout', entityType: 'TeamMember', entityId: req.actor.id, ip: req.ip,
  });
  res.json({ success: true });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const member = await TeamMember.findById(req.actor.id);
  if (!member) throw ApiError.notFound('Account not found');
  res.json({ member: publicMember(member) });
});

// POST /api/auth/change-password  (self-service, while logged in)
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw ApiError.badRequest('Both passwords are required');
  if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters');

  const member = await TeamMember.findById(req.actor.id).select('+passwordHash');
  const ok = await member.verifyPassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');

  await member.setPassword(newPassword);
  member.refreshTokenHash = undefined; // force re-login elsewhere
  await member.save();

  await logActivity({
    actor: req.actor, action: 'auth.change_password', entityType: 'TeamMember', entityId: member._id, ip: req.ip,
  });
  res.json({ success: true });
});

// POST /api/auth/forgot-password
// Issues a reset token. In production this is emailed; here we return it in
// development so the flow is testable without an email provider wired up.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('Email is required');

  const member = await TeamMember.findOne({ email: email.toLowerCase() });
  // Always respond success to avoid leaking which emails exist.
  if (!member) return res.json({ success: true });

  const rawToken = crypto.randomBytes(32).toString('hex');
  member.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  member.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await member.save();

  const payload = { success: true };
  if (process.env.NODE_ENV !== 'production') payload.resetToken = rawToken;
  return res.json(payload);
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw ApiError.badRequest('Token and new password are required');
  if (newPassword.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const member = await TeamMember.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash');
  if (!member) throw ApiError.badRequest('Invalid or expired reset token');

  await member.setPassword(newPassword);
  member.passwordResetTokenHash = undefined;
  member.passwordResetExpires = undefined;
  member.refreshTokenHash = undefined;
  await member.save();

  await logActivity({
    actor: { id: member._id, role: member.role, name: member.name },
    action: 'auth.reset_password',
    entityType: 'TeamMember',
    entityId: member._id,
    ip: req.ip,
  });
  res.json({ success: true });
});
