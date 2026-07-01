import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import TeamMember from '../models/TeamMember.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

function publicNotification(n) {
  return {
    id: n._id,
    recipientType: n.recipientType,
    userId: n.userId,
    teamMemberId: n.teamMemberId,
    title: n.title,
    body: n.body,
    type: n.type,
    relatedId: n.relatedId,
    relatedType: n.relatedType,
    channel: n.channel,
    sentAt: n.sentAt,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

// GET /api/notifications
export const listNotifications = asyncHandler(async (req, res) => {
  const filter = { teamMemberId: req.actor.id, recipientType: 'team' };
  if (req.query.unread === 'true') filter.readAt = null;

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicNotification), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/notifications/unread-count
export const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    teamMemberId: req.actor.id,
    recipientType: 'team',
    readAt: null,
  });
  res.json({ count });
});

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw ApiError.badRequest('Invalid id');

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, teamMemberId: req.actor.id },
    { readAt: new Date() },
    { new: true },
  );
  if (!notification) throw ApiError.notFound('Notification not found');

  res.json(publicNotification(notification));
});

// POST /api/notifications/read-all
export const readAll = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { teamMemberId: req.actor.id, recipientType: 'team', readAt: null },
    { readAt: new Date() },
  );
  res.json({ ok: true });
});

// POST /api/notifications/broadcast
export const broadcast = asyncHandler(async (req, res) => {
  const { title, body, channel, userId, type } = req.body;
  if (!title || !title.trim()) throw ApiError.badRequest('title is required');
  if (!body || !body.trim()) throw ApiError.badRequest('body is required');

  if (userId) {
    // Single user notification
    if (!mongoose.Types.ObjectId.isValid(userId)) throw ApiError.badRequest('Invalid userId');
    const notification = await Notification.create({
      recipientType: 'user',
      userId,
      title: title.trim(),
      body: body.trim(),
      type,
      channel: channel || 'in_app',
    });
    return res.status(201).json({ sent: 1, notifications: [publicNotification(notification)] });
  }

  // Bulk: send to all active team members
  const members = await TeamMember.find({ status: 'active' }).select('_id');
  const docs = members.map((m) => ({
    recipientType: 'team',
    teamMemberId: m._id,
    title: title.trim(),
    body: body.trim(),
    type,
    channel: channel || 'in_app',
    sentAt: new Date(),
  }));

  await Notification.insertMany(docs);

  res.status(201).json({ sent: docs.length });
});
