import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { logActivity } from '../services/auditLog.js';
import { createNotification } from '../services/notificationService.js';
import { PAYMENT_STATUSES } from '../constants/statuses.js';

function publicPayment(p) {
  return {
    id: p._id,
    caseId: p.caseId,
    userId: p.userId,
    amount: p.amount,
    currency: p.currency,
    purpose: p.purpose,
    status: p.status,
    gatewayRef: p.gatewayRef,
    gatewayFailureReason: p.gatewayFailureReason,
    remarks: p.remarks,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/payments/stats
export const paymentStats = asyncHandler(async (req, res) => {
  const [statuses, totalAmount] = await Promise.all([
    Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, sum: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const byStatus = Object.fromEntries(statuses.map((x) => [x._id, { count: x.count, sum: x.sum }]));
  const totalPending = (byStatus.unpaid?.sum ?? 0) + (byStatus.partially_paid?.sum ?? 0);
  const totalPaid = byStatus.paid?.sum ?? 0;

  res.json({
    totalPending,
    totalPaid,
    totalAmount: totalAmount[0]?.total ?? 0,
    byStatus,
  });
});

// GET /api/payments
export const listPayments = asyncHandler(async (req, res) => {
  const { caseId, userId, status } = req.query;
  const filter = {};

  if (caseId) { assertValidId(caseId, 'caseId'); filter.caseId = caseId; }
  if (userId) { assertValidId(userId, 'userId'); filter.userId = userId; }
  if (status) {
    if (!PAYMENT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    filter.status = status;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicPayment), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/payments/:id
export const getPayment = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');
  res.json(publicPayment(payment));
});

// POST /api/payments
export const createPayment = asyncHandler(async (req, res) => {
  const { caseId, userId, amount, currency, purpose, status } = req.body;

  if (!caseId && !userId) throw ApiError.badRequest('caseId or userId is required');
  if (amount === undefined || amount === null) throw ApiError.badRequest('amount is required');
  if (caseId) assertValidId(caseId, 'caseId');
  if (userId) assertValidId(userId, 'userId');
  if (status && !PAYMENT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');

  const payment = await Payment.create({
    caseId: caseId || undefined,
    userId: userId || undefined,
    amount,
    currency: currency || 'INR',
    purpose,
    status: status || 'unpaid',
  });

  res.status(201).json(publicPayment(payment));
});

// PATCH /api/payments/:id
export const updatePayment = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');

  const { status, remarks, gatewayRef, gatewayFailureReason } = req.body;
  const statusChanging = status !== undefined && status !== payment.status;

  if (statusChanging) {
    if (!PAYMENT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    if (!remarks || !remarks.trim()) throw ApiError.badRequest('remarks is required when changing payment status');
  }

  const before = { status: payment.status };

  if (statusChanging) payment.status = status;
  if (remarks !== undefined) payment.remarks = remarks;
  if (gatewayRef !== undefined) payment.gatewayRef = gatewayRef;
  if (gatewayFailureReason !== undefined) payment.gatewayFailureReason = gatewayFailureReason;
  if (status === 'paid' && !payment.paidAt) payment.paidAt = new Date();

  await payment.save();

  if (statusChanging) {
    await logActivity({
      actor: req.actor,
      action: 'payment.status_change',
      entityType: 'Payment',
      entityId: payment._id,
      before,
      after: { status: payment.status, remarks },
      ip: req.ip,
    });

    if (status === 'paid' && payment.userId) {
      createNotification({
        recipientType: 'user',
        userId: payment.userId,
        title: 'Payment confirmed',
        body: `Your payment of ${payment.currency} ${payment.amount} has been confirmed.`,
        type: 'payment_paid',
        relatedId: payment._id,
        relatedType: 'payment',
      });
    }
  }

  res.json(publicPayment(payment));
});
