import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Activity Log Service
 * Manages operational events in `users/{uid}/activity/{activityId}`
 */

export function logUserActivity(uid, activityData) {
  if (!uid) return;

  try {
    const activityRef = collection(db, 'users', uid, 'activity');
    const newRecord = {
      action: activityData.action || 'general_event',
      title: activityData.title || 'Apiary Activity',
      details: activityData.details || '',
      entityId: activityData.entityId || null,
      entityType: activityData.entityType || null,
      timestamp: serverTimestamp(),
    };
    withTimeout(addDoc(activityRef, newRecord), 1000).catch(() => {});
  } catch (_) {}
}

function withTimeout(promise, ms = 2000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

export async function getUserActivities(uid, limitCount = 10) {
  if (!uid) return [];

  try {
    const activityRef = collection(db, 'users', uid, 'activity');
    const q = query(
      activityRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await withTimeout(getDocs(q), 2000);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (err) {
    console.log('[ActivityService] Cloud activity sync deferred:', err?.message);
    return [];
  }
}

export default {
  logUserActivity,
  getUserActivities,
};
