import multer from 'multer';
import { firebaseAuth } from '../config/firebaseAdmin.js';
import { cloudinary } from '../config/cloudinary.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { env } from '../config/env.js';

// ─── multer — memory storage, image files only, 5 MB cap ────────────────────
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// ─── helpers ────────────────────────────────────────────────────────────────

function isValidE164(phone) {
  if (typeof phone !== 'string') return false;
  return /^\+[1-9]\d{7,14}$/.test(phone.trim());
}

function publicUser(u) {
  return {
    id: u._id,
    firebaseUid: u.firebaseUid,
    name: u.name,
    phone: u.phone,
    email: u.email,
    profileImage: u.profileImage || null,
    userType: u.userType,
    country: u.country,
    language: u.language,
    kycStatus: u.kycStatus,
    status: u.status,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

function issueUserTokens(user) {
  const sub = user._id.toString();
  const accessToken = signAccessToken({ sub, type: 'user' });
  const refreshToken = signRefreshToken({ sub, type: 'user' });
  return { accessToken, refreshToken };
}

// Upload a buffer to Cloudinary and return the secure URL.
// folder: 'houseker/avatars', public_id: userId so re-uploads overwrite the old image.
async function uploadImageToCloudinary(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'houseker/avatars',
        public_id: `user_${userId}`,
        overwrite: true,
        resource_type: 'image',
        upload_preset: 'Houseker',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

// Call Firebase Identity Toolkit REST to send an OTP SMS.
async function firebaseSendOtp(phone, captchaToken) {
  const apiKey = env.firebase.clientApiKey;
  if (!apiKey) throw new Error('FIREBASE_CLIENT_API_KEY not configured');

  const res = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/sendVerificationCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: phone,
        recaptchaToken: captchaToken || 'skip-recaptcha-in-dev',
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Failed to send OTP');

  return { sessionInfo: data.sessionInfo, expiresIn: data.expiresIn || 300 };
}

// Call Firebase Identity Toolkit REST to verify the OTP and return a Firebase ID token.
async function firebaseVerifyOtp(sessionInfo, otp) {
  const apiKey = env.firebase.clientApiKey;
  if (!apiKey) throw new Error('FIREBASE_CLIENT_API_KEY not configured');

  const res = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhoneNumber?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo, code: otp }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Invalid OTP');

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    phoneNumber: data.phoneNumber,
  };
}

// Verify a Firebase ID token server-side.
async function firebaseVerifyIdToken(idToken) {
  try {
    return await firebaseAuth.verifyIdToken(idToken);
  } catch (err) {
    console.error('[firebase] verifyIdToken failed:', err.message);
    return null;
  }
}

// ─── controllers ────────────────────────────────────────────────────────────

// Step 1 — POST /api/user-auth/send-otp
// body: { phone: '+919876543210', captchaToken?: '...' }
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone, captchaToken } = req.body;

  if (!isValidE164(phone)) {
    throw ApiError.badRequest('Invalid phone number. Use E.164 format, e.g. +919876543210');
  }

  try {
    const result = await firebaseSendOtp(phone.trim(), captchaToken);
    res.json(result); // { sessionInfo, expiresIn }
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
});

// Step 2 — POST /api/user-auth/verify-otp
// body: { sessionInfo: '...', otp: '123456' }
// Verifies OTP with Firebase, then immediately checks if the user exists in MongoDB.
// New user  → { isNewUser: true,  firebaseUid, phoneNumber, firebaseIdToken }
// Existing  → { isNewUser: false, accessToken, refreshToken, user }
export const verifyOtp = asyncHandler(async (req, res) => {
  const { sessionInfo, otp } = req.body;
  if (!sessionInfo || !otp) throw ApiError.badRequest('sessionInfo and otp are required');

  // 1. Verify OTP with Firebase → get Firebase ID token
  let firebaseResult;
  try {
    firebaseResult = await firebaseVerifyOtp(sessionInfo, otp);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }

  // 2. Verify the ID token with Firebase Admin SDK → get uid + phone
  const decoded = await firebaseVerifyIdToken(firebaseResult.idToken);
  if (!decoded) throw ApiError.unauthorized('Firebase token verification failed');

  // 3. Look up user in MongoDB
  const user = await User.findOne({ firebaseUid: decoded.uid });

  if (!user) {
    // New user — Flutter shows registration screen
    return res.json({
      isNewUser: true,
      firebaseUid: decoded.uid,
      phoneNumber: decoded.phone_number,
      firebaseIdToken: firebaseResult.idToken, // needed for /register
    });
  }

  if (user.status === 'blocked') {
    throw ApiError.forbidden('Account is blocked. Contact support to reactivate.');
  }

  // Existing user — issue JWT and return
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = issueUserTokens(user);
  return res.json({ isNewUser: false, ...tokens, user: publicUser(user) });
});

// Step 4 — POST /api/user-auth/register
// multipart/form-data: firebaseIdToken, name, email, userType?, country?, language?, image? (file)
export const register = asyncHandler(async (req, res) => {
  const { firebaseIdToken, name, email, userType, country, language } = req.body;

  if (!firebaseIdToken) throw ApiError.badRequest('firebaseIdToken is required');
  if (!name?.trim()) throw ApiError.badRequest('name is required');

  const decoded = await firebaseVerifyIdToken(firebaseIdToken);
  if (!decoded) throw ApiError.unauthorized('Invalid Firebase ID token');

  const existing = await User.findOne({ firebaseUid: decoded.uid });
  if (existing) {
    const tokens = issueUserTokens(existing);
    return res.json({ success: true, message: 'User already registered', ...tokens, user: publicUser(existing) });
  }

  // Create user first to get the MongoDB _id (used as Cloudinary public_id)
  const user = await User.create({
    firebaseUid: decoded.uid,
    phone: decoded.phone_number,
    name: name.trim(),
    email: email?.trim().toLowerCase() || undefined,
    userType: userType || 'guest',
    country: country || undefined,
    language: language || 'en',
    lastLoginAt: new Date(),
  });

  // Upload profile image to Cloudinary if provided
  if (req.file) {
    try {
      const imageUrl = await uploadImageToCloudinary(req.file.buffer, user._id.toString());
      user.profileImage = imageUrl;
      await user.save();
    } catch (err) {
      // Image upload failure doesn't block registration — user can update it later
      console.error('[cloudinary] avatar upload failed:', err.message);
    }
  }

  const tokens = issueUserTokens(user);
  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    ...tokens,
    user: publicUser(user),
  });
});

// POST /api/user-auth/refresh
// body: { refreshToken }
// Issues a new token pair without requiring the user to re-authenticate via OTP.
export const refreshUserTokens = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token is invalid or expired. Please log in again.');
  }

  if (payload.type !== 'user') throw ApiError.unauthorized('Invalid token type');

  const user = await User.findById(payload.sub);
  if (!user || user.status === 'blocked') {
    throw ApiError.unauthorized('Account not found or blocked. Please log in again.');
  }

  const tokens = issueUserTokens(user);
  res.json(tokens);
});

// PATCH /api/user-auth/profile-image
// Lets an already-registered user update their profile image.
// multipart/form-data: image (file, required) + Authorization: Bearer <userAccessToken>
export const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('image file is required');

  // req.userId is set by authenticateUser middleware on this route
  const user = await User.findById(req.userId);
  if (!user) throw ApiError.notFound('User not found');

  const imageUrl = await uploadImageToCloudinary(req.file.buffer, user._id.toString());
  user.profileImage = imageUrl;
  await user.save();

  res.json({ success: true, profileImage: imageUrl, user: publicUser(user) });
});
