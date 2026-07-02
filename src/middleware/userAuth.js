import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';

// Authenticates an app user (Flutter) from the Bearer access token — a separate
// identity space from TeamMember (see middleware/auth.js for the admin side).
export async function authenticateUser(req, _res, next) {
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
