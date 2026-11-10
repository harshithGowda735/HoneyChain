import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

const NOTIFICATIONS_CACHE_KEY_PREFIX = '@honeychain_notifs_cache_';

/**
 * In-App Notification Service
 *
 * Architecture Principles:
 * 1. Cloud Firestore (users/{uid}/notifications) is the single authoritative source of truth.
 * 2. AsyncStorage is strictly an optional client-side cache for instant cold-start hydration.
 * 3. Deterministic IDs guarantee idempotency and eliminate duplicate notifications.
 */

async function getCachedNotifications(uid) {
  try {
    const raw = await AsyncStorage.getItem(`${NOTIFICATIONS_CACHE_KEY_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function setCachedNotifications(uid, list) {
  try {
    await AsyncStorage.setItem(
      `${NOTIFICATIONS_CACHE_KEY_PREFIX}${uid}`,
      JSON.stringify(list)
    );
  } catch (_) {}
}

/**
 * Creates or updates an in-app notification in Firestore (authoritative).
 * Uses deterministic ID if provided to guarantee idempotency.
 */
export async function createNotification(uid, notificationData) {
  if (!uid) throw new Error('User ID is required to create a notification.');

  const notifId =
    notificationData.id ||
    `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const notifDoc = {
    id: notifId,
    type: notificationData.type || 'system', // 'temp_high' | 'temp_low' | 'temp_recovered' | 'inspection_due' | 'cleaning_due' | 'harvest_suggestion'
    severity: notificationData.severity || 'info', // 'critical' | 'warning' | 'info' | 'success'
    hiveId: notificationData.hiveId || null,
    hiveName: notificationData.hiveName || 'Apiary',
    title: notificationData.title || 'Notification',
    message: notificationData.message || '',
    data: notificationData.data || {},
    read: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const notifRef = doc(db, 'users', uid, 'notifications', notifId);
    await setDoc(notifRef, {
      ...notifDoc,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    }, { merge: true });

    // Update local cache optimistically
    const cached = await getCachedNotifications(uid);
    const existingIdx = cached.findIndex((n) => n.id === notifId);
    let updatedCache;
    if (existingIdx >= 0) {
      updatedCache = [...cached];
      updatedCache[existingIdx] = { ...updatedCache[existingIdx], ...notifDoc };
    } else {
      updatedCache = [notifDoc, ...cached].slice(0, 100);
    }
    await setCachedNotifications(uid, updatedCache);

    return notifDoc;
  } catch (err) {
    console.log('[NotificationService] Cloud save failed, saved to cache:', err?.message);
    const cached = await getCachedNotifications(uid);
    const updatedCache = [notifDoc, ...cached.filter((n) => n.id !== notifId)].slice(0, 100);
    await setCachedNotifications(uid, updatedCache);
    return notifDoc;
  }
}

/**
 * Fetches user notifications from Firestore (authoritative) with local cache fallback.
 */
export async function getUserNotifications(uid, limitCount = 50) {
  if (!uid) return [];

  const cached = await getCachedNotifications(uid);

  try {
    const notifsRef = collection(db, 'users', uid, 'notifications');
    const q = query(
      notifsRef,
      orderBy('createdAtServer', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remote = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt || (data.createdAtServer?.toDate ? data.createdAtServer.toDate().toISOString() : new Date().toISOString()),
        };
      });

      // Update cache with authoritative Firestore data
      await setCachedNotifications(uid, remote);
      return remote;
    } else {
      // If Firestore collection is empty, sync cache to empty
      if (snapshot.metadata?.fromCache === false) {
        await setCachedNotifications(uid, []);
        return [];
      }
    }
  } catch (err) {
    console.log('[NotificationService] Cloud fetch failed, using cache:', err?.message);
  }

  return cached;
}

/**
 * Marks a single notification as read in Firestore and local cache.
 */
export async function markNotificationAsRead(uid, notificationId) {
  if (!uid || !notificationId) return;

  // Update local cache immediately
  const cached = await getCachedNotifications(uid);
  const updatedCache = cached.map((n) =>
    n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
  );
  await setCachedNotifications(uid, updatedCache);

  try {
    const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAtServer: serverTimestamp(),
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    console.log('[NotificationService] Failed to mark read in cloud:', err?.message);
  }
}

/**
 * Marks all notifications as read for the user.
 */
export async function markAllNotificationsAsRead(uid) {
  if (!uid) return;

  const cached = await getCachedNotifications(uid);
  const updatedCache = cached.map((n) => ({
    ...n,
    read: true,
    readAt: new Date().toISOString(),
  }));
  await setCachedNotifications(uid, updatedCache);

  try {
    const unread = cached.filter((n) => !n.read);
    const updates = unread.map((n) =>
      updateDoc(doc(db, 'users', uid, 'notifications', n.id), {
        read: true,
        readAtServer: serverTimestamp(),
        readAt: new Date().toISOString(),
      }).catch(() => {})
    );
    await Promise.all(updates);
  } catch (err) {
    console.log('[NotificationService] Failed to mark all read in cloud:', err?.message);
  }
}

/**
 * Deletes a notification from Firestore and cache.
 */
export async function deleteNotification(uid, notificationId) {
  if (!uid || !notificationId) return;

  const cached = await getCachedNotifications(uid);
  const updatedCache = cached.filter((n) => n.id !== notificationId);
  await setCachedNotifications(uid, updatedCache);

  try {
    const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (err) {
    console.log('[NotificationService] Failed to delete in cloud:', err?.message);
  }
}

/**
 * Clears all notifications for the user.
 */
export async function clearAllNotifications(uid) {
  if (!uid) return;

  const cached = await getCachedNotifications(uid);
  await setCachedNotifications(uid, []);

  try {
    const deletes = cached.map((n) =>
      deleteDoc(doc(db, 'users', uid, 'notifications', n.id)).catch(() => {})
    );
    await Promise.all(deletes);
  } catch (err) {
    console.log('[NotificationService] Failed to clear all in cloud:', err?.message);
  }
}

export default {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
};

