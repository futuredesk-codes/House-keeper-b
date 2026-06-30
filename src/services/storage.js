import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Pluggable file storage. The `local` driver stores files on disk and serves them
// only through short-lived HMAC-signed URLs (spec 12.2 "Files use signed URLs").
// Swap this module for an S3/GCS implementation in production without touching callers.

const localDir = path.resolve(env.storage.localDir);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

ensureDir(localDir);

export function generateStorageKey(originalName = 'file') {
  const ext = path.extname(originalName);
  const id = crypto.randomBytes(16).toString('hex');
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `${datePrefix}/${id}${ext}`;
}

/** Persist a buffer and return the storage key. */
export async function saveBuffer(storageKey, buffer) {
  const dest = path.join(localDir, storageKey);
  ensureDir(path.dirname(dest));
  await fs.promises.writeFile(dest, buffer);
  return storageKey;
}

export function localPathFor(storageKey) {
  return path.join(localDir, storageKey);
}

export async function deleteObject(storageKey) {
  try {
    await fs.promises.unlink(localPathFor(storageKey));
  } catch {
    /* already gone */
  }
}

function sign(storageKey, expires) {
  return crypto
    .createHmac('sha256', env.storage.signingSecret)
    .update(`${storageKey}:${expires}`)
    .digest('hex');
}

/**
 * Build a time-limited signed URL for previewing/downloading an object.
 * @returns {string} relative URL the client can request from the API
 */
export function getSignedUrl(storageKey, { ttl = env.storage.signedUrlTtl } = {}) {
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const sig = sign(storageKey, expires);
  const key = encodeURIComponent(storageKey);
  return `/api/files/${key}?expires=${expires}&signature=${sig}`;
}

/** Verify a signed URL's expiry + signature. */
export function verifySignature(storageKey, expires, signature) {
  if (!expires || !signature) return false;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(storageKey, expires);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
