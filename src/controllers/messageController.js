import mongoose from 'mongoose';
import Message from '../models/Message.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { getIo } from '../services/socket.js';

function publicMessage(m) {
  return {
    id: m._id,
    caseId: m.caseId,
    enquiryId: m.enquiryId,
    senderId: m.senderId,
    senderRole: m.senderRole,
    body: m.body,
    attachments: m.attachments,
    readAt: m.readAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/messages
export const listMessages = asyncHandler(async (req, res) => {
  const { caseId, enquiryId } = req.query;
  if (!caseId && !enquiryId) throw ApiError.badRequest('caseId or enquiryId query param is required');

  const filter = {};
  if (caseId) { assertValidId(caseId, 'caseId'); filter.caseId = caseId; }
  if (enquiryId) { assertValidId(enquiryId, 'enquiryId'); filter.enquiryId = enquiryId; }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicMessage), meta: buildPageMeta({ page, limit, total }) });
});

// POST /api/messages
export const sendMessage = asyncHandler(async (req, res) => {
  const { caseId, enquiryId, body, attachments } = req.body;
  if (!body || !body.trim()) throw ApiError.badRequest('Message body is required');
  if (!caseId && !enquiryId) throw ApiError.badRequest('caseId or enquiryId is required');
  if (caseId) assertValidId(caseId, 'caseId');
  if (enquiryId) assertValidId(enquiryId, 'enquiryId');

  const msg = await Message.create({
    caseId: caseId || undefined,
    enquiryId: enquiryId || undefined,
    senderId: req.actor.id,
    senderRole: 'team',
    body: body.trim(),
    attachments: attachments || [],
  });

  // Emit to Socket.io room
  const room = caseId ? `case:${caseId}` : `enquiry:${enquiryId}`;
  try {
    getIo().to(room).emit('message:new', publicMessage(msg));
  } catch {
    // Socket.io may not be up in test environments — do not fail the request
  }

  res.status(201).json(publicMessage(msg));
});

// PATCH /api/messages/:id/read
export const markRead = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const msg = await Message.findByIdAndUpdate(
    req.params.id,
    { readAt: new Date() },
    { new: true },
  );
  if (!msg) throw ApiError.notFound('Message not found');
  res.json(publicMessage(msg));
});
