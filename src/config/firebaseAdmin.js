import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env.js';

// Only initialise once (HMR / --watch safety)
if (!getApps().length) {
  const credential = env.firebase.clientEmail && env.firebase.privateKey
    ? cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        // dotenv stores newlines as literal \n — restore them
        privateKey: env.firebase.privateKey.replace(/\\n/g, '\n'),
      })
    : undefined; // falls back to Application Default Credentials if available

  initializeApp(credential ? { credential, projectId: env.firebase.projectId } : { projectId: env.firebase.projectId });
}

// Export a pre-bound auth instance so callers never touch the app object directly
export const firebaseAuth = getAuth();
