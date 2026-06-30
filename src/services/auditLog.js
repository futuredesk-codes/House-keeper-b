import ActivityLog from '../models/ActivityLog.js';

/**
 * Write an audit entry. Used for every status change, verification, publish,
 * payment change and role change (spec 11.2 / 12.2). Best-effort: a logging
 * failure must never break the primary operation.
 *
 * @param {object} p
 * @param {object} [p.actor]      the authenticated actor (req.actor)
 * @param {string} p.action       e.g. 'enquiry.status_change'
 * @param {string} p.entityType   e.g. 'Enquiry'
 * @param {*}      [p.entityId]
 * @param {*}      [p.before]
 * @param {*}      [p.after]
 * @param {string} [p.remarks]
 * @param {string} [p.ip]
 */
export async function logActivity({
  actor, action, entityType, entityId, before, after, remarks, ip,
}) {
  try {
    await ActivityLog.create({
      actorId: actor?.id,
      actorRole: actor?.role || 'system',
      actorName: actor?.name,
      action,
      entityType,
      entityId,
      before,
      after,
      remarks,
      ip,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auditLog] failed to write activity log:', err.message);
  }
}
