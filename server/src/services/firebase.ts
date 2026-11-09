import admin from 'firebase-admin';
import fs from 'fs';
import { config } from '../config';

let adminApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (adminApp) return adminApp;

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  try {
    if (config.serviceAccountPath && fs.existsSync(config.serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(config.serviceAccountPath, 'utf-8'));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebaseProjectId,
      });
      console.log(`[Firebase Admin] Initialized with Service Account for ${config.firebaseProjectId}`);
    } else {
      adminApp = admin.initializeApp({
        projectId: config.firebaseProjectId,
      });
      console.log(`[Firebase Admin] Initialized with Project ID: ${config.firebaseProjectId}`);
    }
  } catch (err: any) {
    console.warn(`[Firebase Admin] Init notice: ${err.message}`);
    adminApp = admin.initializeApp({
      projectId: config.firebaseProjectId,
    });
  }

  return adminApp;
}

export async function verifyAuthToken(idToken: string): Promise<{ uid: string; email?: string; phone_number?: string }> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing authentication token.');
  }

  // Handle local development/demo tokens
  if (idToken.startsWith('mock_') || idToken.startsWith('demo_')) {
    const parts = idToken.split('_');
    const uid = parts[1] || 'beekeeper_demo';
    return {
      uid,
      phone_number: '+919876543210',
    };
  }

  try {
    const app = getFirebaseAdmin();
    const decoded = await app.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      phone_number: decoded.phone_number,
    };
  } catch (err: any) {
    // If running in development without a service account private key, support graceful local decoding
    if (process.env.NODE_ENV !== 'production' && idToken.includes('.')) {
      try {
        const payloadBase64 = idToken.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        if (payload?.user_id || payload?.sub) {
          return {
            uid: payload.user_id || payload.sub,
            email: payload.email,
            phone_number: payload.phone_number,
          };
        }
      } catch (_) {}
    }
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}

