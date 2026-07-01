import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { initSocket } from './services/socket.js';

async function start() {
  try {
    await connectDB();
    const app = createApp();
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] HOUSEKER API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
