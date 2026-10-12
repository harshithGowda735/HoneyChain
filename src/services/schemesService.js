import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { VERIFIED_SCHEMES } from '../data/verifiedSchemes';

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_SCHEMES_KEY_PREFIX = '@honeychain_saved_schemes_';

/**
 * Schemes Service
 * Manages access to verified government schemes and private user bookmarks.
 * Falls back to local AsyncStorage if Firestore rules deny cloud access.
 */

/**
 * Returns all verified schemes with static verification metadata.
 */
export async function getVerifiedSchemes() {
  return VERIFIED_SCHEMES;
}

/**
 * Fetches the user's saved scheme bookmark IDs.
 */
export async function getUserSavedSchemes(uid) {
  if (!uid) return [];

  // Try cloud Firestore first
  try {
    const savedColRef = collection(db, 'users', uid, 'saved_schemes');
    const snap = await getDocs(savedColRef);
    const bookmarks = [];

    snap.forEach((docSnap) => {
      bookmarks.push({
        id: docSnap.id,
        schemeId: docSnap.data().schemeId || docSnap.id,
        savedAt: docSnap.data().savedAt,
      });
    });

    if (bookmarks.length > 0) {
      await AsyncStorage.setItem(
        LOCAL_SCHEMES_KEY_PREFIX + uid,
        JSON.stringify(bookmarks.map((b) => b.schemeId))
      );
    }

    return bookmarks;
  } catch (err) {
    // Cloud access failed (e.g. security rules not yet published in Firebase Console)
    // Fall back to local AsyncStorage cache so bookmarks still work locally
    try {
      const localData = await AsyncStorage.getItem(LOCAL_SCHEMES_KEY_PREFIX + uid);
      if (localData) {
        const parsed = JSON.parse(localData);
        return parsed.map((id) => ({ id, schemeId: id, savedAt: new Date().toISOString() }));
      }
    } catch (_) {}
    return [];
  }
}

/**
 * Saves a scheme bookmark for the user.
 */
export async function saveSchemeBookmark(uid, schemeId) {
  if (!uid) throw new Error('Authentication required to save bookmarks.');
  if (!schemeId) throw new Error('Scheme ID is required.');

  // Always update local cache for instant UI feedback
  try {
    const localData = await AsyncStorage.getItem(LOCAL_SCHEMES_KEY_PREFIX + uid);
    const current = localData ? JSON.parse(localData) : [];
    if (!current.includes(schemeId)) {
      current.push(schemeId);
      await AsyncStorage.setItem(LOCAL_SCHEMES_KEY_PREFIX + uid, JSON.stringify(current));
    }
  } catch (_) {}

  // Attempt to sync to cloud Firestore
  try {
    const bookmarkRef = doc(db, 'users', uid, 'saved_schemes', schemeId);
    await setDoc(bookmarkRef, {
      schemeId,
      savedAt: serverTimestamp(),
    });
  } catch (err) {
    // Graceful notice; local storage succeeded
    console.log('[schemesService] Cloud bookmark sync deferred until Firebase Console rules deployment.');
  }

  return { success: true, schemeId };
}

/**
 * Removes a scheme bookmark for the user.
 */
export async function removeSchemeBookmark(uid, schemeId) {
  if (!uid) throw new Error('Authentication required to modify bookmarks.');
  if (!schemeId) throw new Error('Scheme ID is required.');

  // Always update local cache
  try {
    const localData = await AsyncStorage.getItem(LOCAL_SCHEMES_KEY_PREFIX + uid);
    if (localData) {
      const current = JSON.parse(localData);
      const filtered = current.filter((id) => id !== schemeId);
      await AsyncStorage.setItem(LOCAL_SCHEMES_KEY_PREFIX + uid, JSON.stringify(filtered));
    }
  } catch (_) {}

  // Attempt to remove from cloud Firestore
  try {
    const bookmarkRef = doc(db, 'users', uid, 'saved_schemes', schemeId);
    await deleteDoc(bookmarkRef);
  } catch (err) {
    console.log('[schemesService] Cloud bookmark delete deferred.');
  }

  return { success: true, schemeId };
}

export default {
  getVerifiedSchemes,
  getUserSavedSchemes,
  saveSchemeBookmark,
  removeSchemeBookmark,
};
