import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember.js';
import { env } from '../config/env.js';
import { corsOrigin } from '../config/cors.js';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret);
      const member = await TeamMember.findById(payload.sub).select('name role permissions status');
      if (!member || member.status !== 'active') return next(new Error('Unauthorized'));
      socket.actor = {
        id: member._id,
        name: member.name,
        role: member.role,
        permissions: member.permissions,
      };
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  // Room format: 'case:<objectId>' or 'enquiry:<objectId>'
  const ROOM_RE = /^(case|enquiry):[a-f0-9]{24}$/;

  io.on('connection', (socket) => {
    socket.on('join', (room) => {
      if (ROOM_RE.test(room)) socket.join(room);
    });
    socket.on('leave', (room) => {
      if (ROOM_RE.test(room)) socket.leave(room);
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
