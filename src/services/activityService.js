import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

const LOCAL_ACTIVITIES_KEY_PREFIX = '@honeychain_activities_';

/**
 * Activity Log Service
 * Manages operational events in `users/{uid}/activity/{activityId}`
 * with local AsyncStorage caching to guarantee resilience against offline/cloud permission restrictions.
 */

async function getLocalActivities(uid) {
  if (!uid) return [];
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY_PREFIX + uid);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveLocalActivities(uid, list) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(LOCAL_ACTIVITIES_KEY_PREFIX + uid, JSON.stringify(list));
  } catch (_) {}
}

export async function logUserActivity(uid, activityData) {
  if (!uid || typeof uid !== 'string' || !uid.trim()) return;
  const cleanUid = uid.trim();

  const newRecord = {
    id: 'act_' + Date.now(),
    action: activityData.action || 'general_event',
    title: activityData.title || 'Apiary Activity',
    details: activityData.details || '',
    entityId: activityData.entityId || null,
    entityType: activityData.entityType || null,
    timestamp: new Date().toISOString(),
  };

  // 1. Cache locally first
  const existing = await getLocalActivities(cleanUid);
  const updated = [newRecord, ...existing].slice(0, 30);
  await saveLocalActivities(cleanUid, updated);

  // 2. Sync to Firestore (non-blocking)
  try {
    const activityRef = collection(db, 'users', cleanUid, 'activity');
    await addDoc(activityRef, {
      ...newRecord,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking logging failure
  }
}

export async function getUserActivities(uid, limitCount = 10) {
  if (!uid || typeof uid !== 'string' || !uid.trim()) return [];
  const cleanUid = uid.trim();

  const localActivities = await getLocalActivities(cleanUid);

  try {
    const activityRef = collection(db, 'users', cleanUid, 'activity');
    const q = query(
      activityRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remote = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      await saveLocalActivities(cleanUid, remote);
      return remote;
    }
    return localActivities.slice(0, limitCount);
  } catch (err) {
    // Graceful offline & permission fallback
    return localActivities.slice(0, limitCount);
  }
}

export default {
  logUserActivity,
  getUserActivities,
};
