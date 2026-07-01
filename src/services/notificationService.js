import Notification from '../models/Notification.js';

export async function createNotification({
  recipientType,
  userId,
  teamMemberId,
  title,
  body,
  type,
  relatedId,
  relatedType,
  channel = 'in_app',
}) {
  try {
    await Notification.create({
      recipientType,
      userId,
      teamMemberId,
      title,
      body,
      type,
      relatedId,
      relatedType,
      channel,
    });
  } catch {
    // fire-and-forget — never throw
  }
}
