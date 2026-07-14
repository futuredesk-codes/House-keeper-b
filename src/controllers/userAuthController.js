import multer from 'multer';
import { firebaseAuth } from '../config/firebaseAdmin.js';
import { cloudinary } from '../config/cloudinary.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

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

// POST /api/user-auth/verify-phone
// body: { firebaseIdToken }
// The Flutter app verifies the phone number itself via the native firebase_auth SDK
// (FirebaseAuth.verifyPhoneNumber + signInWithCredential) — that's what handles the
// reCAPTCHA/Play Integrity challenge on-device. We just verify the resulting ID token
// and check whether the user already exists in MongoDB.
// New user  → { isNewUser: true,  firebaseUid, phoneNumber, firebaseIdToken }
// Existing  → { isNewUser: false, accessToken, refreshToken, user }
export const verifyPhone = asyncHandler(async (req, res) => {
  const { firebaseIdToken } = req.body;
  if (!firebaseIdToken) throw ApiError.badRequest('firebaseIdToken is required');

  const decoded = await firebaseVerifyIdToken(firebaseIdToken);
  if (!decoded) throw ApiError.unauthorized('Firebase token verification failed');

  const user = await User.findOne({ firebaseUid: decoded.uid });

  if (!user) {
    // New user — Flutter shows registration screen
    return res.json({
      isNewUser: true,
      firebaseUid: decoded.uid,
      phoneNumber: decoded.phone_number,
      firebaseIdToken, // needed for /register
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

// POST /api/user-auth/social-login
// body: { idToken } — Firebase ID token obtained client-side after Google Sign-In
// New user  → auto-created from the Google profile claims, then logged in
// Existing  → looked up by firebaseUid, logged in
export const socialLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) throw ApiError.badRequest('idToken is required');

  const decoded = await firebaseVerifyIdToken(idToken);
  if (!decoded) throw ApiError.unauthorized('Invalid Firebase ID token');

  let user = await User.findOne({ firebaseUid: decoded.uid });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      firebaseUid: decoded.uid,
      name: decoded.name || decoded.email?.split('@')[0] || 'Google User',
      email: decoded.email?.toLowerCase(),
      profileImage: decoded.picture,
      userType: 'guest',
      language: 'en',
      lastLoginAt: new Date(),
    });
  } else {
    if (user.status === 'blocked') {
      throw ApiError.forbidden('Account is blocked. Contact support to reactivate.');
    }
    user.lastLoginAt = new Date();
    await user.save();
  }

  const tokens = issueUserTokens(user);
  res.json({ isNewUser, ...tokens, user: publicUser(user) });
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
