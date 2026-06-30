import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import TeamMember from '../models/TeamMember.js';

// Authenticates an admin/team account from the Bearer access token and loads the
// live permission set from the DB (never trust permissions baked into the token).
export async function authenticate(req, _res, next) {
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

    const member = await TeamMember.findById(payload.sub);
    if (!member || member.status !== 'active') {
      throw ApiError.unauthorized('Account not found or inactive');
    }

    req.actor = {
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      permissions: member.permissions,
    };
    next();
  } catch (err) {
    next(err);
  }
}
