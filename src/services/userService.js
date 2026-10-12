import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * User Profile Service
 * Manages official beekeeper profile documents in `users/{uid}`
 */

export async function getUserProfile(uid) {
  if (!uid) throw new Error('User ID is required to fetch profile.');
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...snap.data() };
}

export async function createUserProfile(uid, data = {}) {
  if (!uid) throw new Error('User ID is required to create profile.');
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);

  // Do not overwrite existing profile on re-login
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }

  const newProfile = {
    uid,
    phoneNumber: data.phoneNumber || '',
    displayName: data.displayName || 'Beekeeper',
    role: data.role || 'beekeeper',
    apiaryName: data.apiaryName || 'My Apiary',
    state: data.state || 'Karnataka',
    district: data.district || '',
    entityType: data.entityType || 'farmer', // 'farmer' | 'fpo_shg' | 'enterprise'
    preferredLanguage: data.preferredLanguage || 'en',
    photoUrl: data.photoUrl || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userDocRef, newProfile);
  return { id: uid, ...newProfile };
}

export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error('User ID is required to update profile.');
  const userDocRef = doc(db, 'users', uid);

  // Security: Never change the primary UID or createdAt
  const safeData = { ...data };
  delete safeData.uid;
  delete safeData.createdAt;

  safeData.updatedAt = serverTimestamp();

  await updateDoc(userDocRef, safeData);
  return await getUserProfile(uid);
}

export default {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
};
