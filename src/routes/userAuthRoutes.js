import { Router } from 'express';
import {
  verifyPhone, register, socialLogin,
  updateProfileImage, uploadAvatar, refreshUserTokens,
} from '../controllers/userAuthController.js';
import { authenticateUser } from '../middleware/userAuth.js';

const router = Router();

// ── Phone OTP flow (no auth needed) ─────────────────────────────────────────
// OTP is sent/verified on-device via the Firebase SDK (handles reCAPTCHA/Play
// Integrity itself). The app only calls the backend once it holds a Firebase ID token.

// Verify the Firebase ID token → new user OR existing user login (merged, single call)
router.post('/verify-phone', verifyPhone);

// Step 3 — new user only: submit name + email + optional image
router.post('/register', uploadAvatar.single('image'), register);

// Refresh — exchange a valid refresh token for a new token pair
router.post('/refresh', refreshUserTokens);

// Social login (Google Sign-In) — verifies a Firebase ID token, logs in or auto-creates the user
router.post('/social-login', socialLogin);

// ── Authenticated user routes ────────────────────────────────────────────────

// Update profile image after registration
router.patch('/profile-image', authenticateUser, uploadAvatar.single('image'), updateProfileImage);

export default router;
