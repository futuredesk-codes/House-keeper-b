import User from '../models/User.js';
import Case from '../models/Case.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function publicUserProfile(u, stats) {
  return {
    id: u._id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    profileImage: u.profileImage,
    userType: u.userType,
    country: u.country,
    language: u.language,
    kycStatus: u.kycStatus,
    status: u.status,
    createdAt: u.createdAt,
    stats: stats ?? undefined,
  };
}

// GET /api/user/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw ApiError.notFound('User not found');

  const IN_PROGRESS_STATUSES = ['submitted', 'under_review', 'awaiting_user', 'assigned', 'in_progress', 'field_visit_scheduled', 'report_under_review', 'report_ready', 'payment_pending'];

  const [totalCases, inProgressCases, completedCases] = await Promise.all([
    Case.countDocuments({ userId: req.userId }),
    Case.countDocuments({ userId: req.userId, status: { $in: IN_PROGRESS_STATUSES } }),
    Case.countDocuments({ userId: req.userId, status: 'completed' }),
  ]);

  res.json(publicUserProfile(user, { totalCases, inProgressCases, completedCases }));
});

// PATCH /api/user/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw ApiError.notFound('User not found');

  const { name, email, country, language } = req.body;
  if (name !== undefined) user.name = name.trim();
  if (email !== undefined) user.email = email.trim() || undefined;
  if (country !== undefined) user.country = country;
  if (language !== undefined) user.language = language;

  await user.save();
  res.json(publicUserProfile(user));
});
