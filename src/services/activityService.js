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

export async function logUserActivity(uid, activityData) {
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
    await addDoc(activityRef, newRecord);
  } catch (err) {
    // Non-blocking logging failure
    console.warn('[ActivityService] Failed to record user activity:', err?.message);
  }
}

export async function getUserActivities(uid, limitCount = 10) {
  if (!uid) return [];

  const activityRef = collection(db, 'users', uid, 'activity');
  const q = query(
    activityRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export default {
  logUserActivity,
  getUserActivities,
};
