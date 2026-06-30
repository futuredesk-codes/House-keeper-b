import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  // Mongoose / Mongo specific niceties
  let message = err.message || 'Internal server error';
  if (err.code === 11000) {
    message = `Duplicate value: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }

  res.status(status === 500 && err.code === 11000 ? 409 : status).json({
    error: {
      message,
      details: err.details,
      ...(env.nodeEnv === 'development' && status >= 500 ? { stack: err.stack } : {}),
    },
  });
}
