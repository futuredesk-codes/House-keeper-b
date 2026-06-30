import ApiError from '../utils/ApiError.js';
import { hasPermission } from '../constants/roles.js';

// Enforce that the authenticated actor holds ALL of the required permissions.
// Permissions are checked on the backend for every protected action (spec 12.2).
export function requirePermission(...required) {
  return (req, _res, next) => {
    if (!req.actor) return next(ApiError.unauthorized());
    const ok = required.every((perm) => hasPermission(req.actor.permissions, perm));
    if (!ok) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}

// Enforce that the actor holds AT LEAST ONE of the listed permissions.
export function requireAnyPermission(...required) {
  return (req, _res, next) => {
    if (!req.actor) return next(ApiError.unauthorized());
    const ok = required.some((perm) => hasPermission(req.actor.permissions, perm));
    if (!ok) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}
