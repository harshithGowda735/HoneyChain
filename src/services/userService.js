import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

const PROFILE_STORAGE_KEY_PREFIX = '@honeychain_user_profile_';

async function getLocalProfile(uid) {
  try {
    const raw = await AsyncStorage.getItem(`${PROFILE_STORAGE_KEY_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

async function saveLocalProfile(uid, profile) {
  try {
    await AsyncStorage.setItem(
      `${PROFILE_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(profile)
    );
  } catch (_) {}
}

/**
 * User Profile Service
 * Manages official beekeeper profile documents with offline AsyncStorage persistence
 * and resilient Firestore permission fallbacks.
 */

export async function getUserProfile(uid) {
  if (!uid) throw new Error('User ID is required to fetch profile.');

  // 1. Check local cache first for instant rendering
  const localProfile = await getLocalProfile(uid);

  // 2. Attempt Firestore sync
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const remoteData = { id: snap.id, ...snap.data() };
      await saveLocalProfile(uid, remoteData);
      return remoteData;
    }
  } catch (err) {
    // Graceful fallback on permission error or offline state
    if (localProfile) {
      return localProfile;
    }
  }

  return localProfile || null;
}

export async function createUserProfile(uid, data = {}) {
  if (!uid) throw new Error('User ID is required to create profile.');

  // 1. Check existing local or remote profile
  const existingLocal = await getLocalProfile(uid);
  if (existingLocal) {
    // Preserve already established profile fields
    const merged = { ...existingLocal, ...data };
    await saveLocalProfile(uid, merged);
  }

  const isComplete = data.isProfileComplete !== undefined ? Boolean(data.isProfileComplete) : true;

  const baseProfile = {
    id: uid,
    uid,
    phoneNumber: data.phoneNumber || '',
    displayName: data.displayName || 'Beekeeper',
    role: data.role || 'beekeeper',
    apiaryName: data.apiaryName || 'Cauvery Honey Farm',
    state: data.state || 'Karnataka',
    district: data.district || '',
    entityType: data.entityType || 'farmer', // 'farmer' | 'fpo_shg' | 'enterprise'
    preferredLanguage: data.preferredLanguage || 'en',
    photoUrl: data.photoUrl || existingLocal?.photoUrl || null,
    isProfileComplete: isComplete,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const finalProfile = existingLocal ? { ...existingLocal, ...data } : baseProfile;

  // Save locally first so profile data is never lost
  await saveLocalProfile(uid, finalProfile);

  // Attempt Firestore sync
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      const firestoreProfile = {
        ...finalProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      delete firestoreProfile.id;
      await setDoc(userDocRef, firestoreProfile);
    }
  } catch (err) {
    // Permissions or network notice — local state safely preserved
    console.log('[HoneyChain Auth] Local profile active for session:', uid);
  }

  return finalProfile;
}

export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error('User ID is required to update profile.');

  // 1. Fetch current local profile to merge safely
  const current = (await getLocalProfile(uid)) || { id: uid, uid };
  const updated = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  delete updated.createdAt;
  await saveLocalProfile(uid, updated);

  // 2. Attempt Firestore sync
  try {
    const userDocRef = doc(db, 'users', uid);
    const safeData = { ...data };
    delete safeData.uid;
    delete safeData.createdAt;
    delete safeData.id;
    safeData.updatedAt = serverTimestamp();

    await updateDoc(userDocRef, safeData);
  } catch (err) {
    console.log('[HoneyChain Auth] Profile updated locally in offline mode:', uid);
  }

  return updated;
}

export default {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
};

