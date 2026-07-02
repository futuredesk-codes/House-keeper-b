import { Router } from 'express';
import {
  sendOtp, verifyOtp, register,
  updateProfileImage, uploadAvatar, refreshUserTokens,
} from '../controllers/userAuthController.js';
import { authenticateUser } from '../middleware/userAuth.js';

const router = Router();

// ── Phone OTP flow (no auth needed) ─────────────────────────────────────────

// Step 1 — send OTP SMS to the phone number
router.post('/send-otp', sendOtp);

// Step 2 — verify OTP → new user OR existing user login (merged, single call)
router.post('/verify-otp', verifyOtp);

// Step 3 — new user only: submit name + email + optional image
router.post('/register', uploadAvatar.single('image'), register);

// Refresh — exchange a valid refresh token for a new token pair
router.post('/refresh', refreshUserTokens);

// ── Authenticated user routes ────────────────────────────────────────────────

// Update profile image after registration
router.patch('/profile-image', authenticateUser, uploadAvatar.single('image'), updateProfileImage);

export default router;
