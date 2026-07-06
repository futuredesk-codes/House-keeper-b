import { env } from './env.js';

function escapeRegex(str) {
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

// Supports '*' as a wildcard, e.g. 'https://housker-admin-*.vercel.app' for preview deployments.
const patterns = env.adminOrigins.map(
  (origin) => new RegExp(`^${escapeRegex(origin).replace(/\*/g, '.*')}$`)
);

export function corsOrigin(origin, callback) {
  // Requests with no Origin header (curl, server-to-server, mobile clients) are allowed through.
  if (!origin || patterns.some((re) => re.test(origin))) return callback(null, true);
  callback(new Error(`Origin ${origin} not allowed by CORS`));
}
