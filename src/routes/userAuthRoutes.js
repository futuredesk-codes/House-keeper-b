import { Router } from 'express';
import {
  sendOtp, verifyOtp, register,
  updateProfileImage, uploadAvatar,
} from '../controllers/userAuthController.js';
import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';

const router = Router();

// Lightweight middleware — authenticates an app user (not a TeamMember).
async function authenticateUser(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    if (payload.type !== 'user') throw ApiError.unauthorized('Token is not a user token');

    const user = await User.findById(payload.sub);
    if (!user || user.status === 'blocked') throw ApiError.unauthorized('Account not found or blocked');

    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
}

// ── Phone OTP flow (no auth needed) ─────────────────────────────────────────

// Step 1 — send OTP SMS to the phone number
router.post('/send-otp', sendOtp);

// Step 2 — verify OTP → new user OR existing user login (merged, single call)
router.post('/verify-otp', verifyOtp);

// Step 3 — new user only: submit name + email + optional image
router.post('/register', uploadAvatar.single('image'), register);

// ── Authenticated user routes ────────────────────────────────────────────────

// Update profile image after registration
router.patch('/profile-image', authenticateUser, uploadAvatar.single('image'), updateProfileImage);

export default router;
