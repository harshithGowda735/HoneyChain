import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

const HIVES_STORAGE_KEY_PREFIX = '@honeychain_hives_';

function withTimeout(promise, ms = 2000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

export async function getLocalHives(uid) {
  try {
    let raw = await AsyncStorage.getItem(`${HIVES_STORAGE_KEY_PREFIX}${uid}`);
    if (!raw && uid && uid !== 'beekeeper_demo') {
      // Check if demo fallback data exists and seamlessly migrate it
      const demoRaw = await AsyncStorage.getItem(`${HIVES_STORAGE_KEY_PREFIX}beekeeper_demo`);
      if (demoRaw) {
        try {
          const list = JSON.parse(demoRaw).map((h) => ({ ...h, ownerUid: uid }));
          await AsyncStorage.setItem(`${HIVES_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(list));
          return list;
        } catch (_) {}
      }
    }
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveLocalHives(uid, hives) {
  try {
    await AsyncStorage.setItem(
      `${HIVES_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(hives)
    );
  } catch (_) {}
}

/**
 * Hive Service
 * Manages colony documents in `hives/{hiveId}` with local caching
 * and resilient permission fallbacks.
 */

export async function getUserHives(uid) {
  if (!uid) return [];

  const localHives = await getLocalHives(uid);

  try {
    const hivesRef = collection(db, 'hives');
    const q = query(hivesRef, where('ownerUid', '==', uid));
    const snapshot = await withTimeout(getDocs(q), 2000);

    if (!snapshot.empty) {
      const hives = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Sort descending by creation timestamp
      const sorted = hives.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });

      await saveLocalHives(uid, sorted);
      return sorted;
    }
  } catch (err) {
    // Cloud access failed or permissions pending — return local cache
    console.log('[HiveService] Firestore fetch notice, using local cache:', err?.message);
    if (localHives.length > 0) {
      return localHives;
    }
  }

  return localHives;
}

export async function getHiveById(hiveId, uid) {
  if (!hiveId) throw new Error('Hive ID is required.');

  // Check local cache first
  const localHives = await getLocalHives(uid);
  const foundLocal = localHives.find((h) => h.id === hiveId);

  try {
    const hiveDocRef = doc(db, 'hives', hiveId);
    const snap = await getDoc(hiveDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.ownerUid !== uid) {
        throw new Error('Unauthorized access to hive.');
      }
      return { id: snap.id, ...data };
    }
  } catch (err) {
    if (foundLocal) return foundLocal;
    throw err;
  }

  if (foundLocal) return foundLocal;
  throw new Error('Hive not found.');
}

export async function createHive(uid, hiveData) {
  if (!uid) throw new Error('User ID is required to create a hive.');
  if (!hiveData.name || !hiveData.name.trim()) {
    throw new Error('Hive name is required.');
  }
  if (!hiveData.location || !hiveData.location.trim()) {
    throw new Error('Hive yard/location is required.');
  }

  const newId = `hive_${Date.now()}`;
  const newHive = {
    id: newId,
    ownerUid: uid,
    name: hiveData.name.trim(),
    location: hiveData.location.trim(),
    apiaryName: hiveData.apiaryName || 'Cauvery Honey Farm',
    status: hiveData.status || 'healthy',
    queenStatus: hiveData.queenStatus || 'Marked - Active',
    notes: hiveData.notes || '',
    framesCount: Number(hiveData.framesCount) || 10,
    honeySuperCount: Number(hiveData.honeySuperCount) || 1,
    sensorDeviceId: hiveData.sensorDeviceId || null,
    temperature: hiveData.temperature ?? null,
    humidity: hiveData.humidity ?? null,
    weight: hiveData.weight ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to local storage immediately
  const localHives = await getLocalHives(uid);
  const updatedLocal = [newHive, ...localHives];
  await saveLocalHives(uid, updatedLocal);

  // 2. Non-blocking cloud sync with fast timeout
  withTimeout(
    setDoc(doc(db, 'hives', newId), {
      ...newHive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    1200
  ).catch((err) => {
    console.log('[HiveService] Hive saved locally (cloud deferred):', err?.message);
  });

  return newHive;
}

export async function updateHive(hiveId, uid, hiveData) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // 1. Update local cache immediately
  const localHives = await getLocalHives(uid);
  const updatedLocal = localHives.map((h) =>
    h.id === hiveId ? { ...h, ...hiveData, updatedAt: new Date().toISOString() } : h
  );
  await saveLocalHives(uid, updatedLocal);

  // 2. Non-blocking cloud sync with fast timeout
  const safeData = { ...hiveData };
  delete safeData.ownerUid;
  delete safeData.createdAt;
  delete safeData.id;
  safeData.updatedAt = serverTimestamp();

  withTimeout(updateDoc(doc(db, 'hives', hiveId), safeData), 1200).catch((err) => {
    console.log('[HiveService] Hive updated locally (cloud deferred):', err?.message);
  });

  return updatedLocal.find((h) => h.id === hiveId);
}

export async function deleteHive(hiveId, uid) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // 1. Update local cache immediately
  const localHives = await getLocalHives(uid);
  const updatedLocal = localHives.filter((h) => h.id !== hiveId);
  await saveLocalHives(uid, updatedLocal);

  // 2. Non-blocking cloud delete with fast timeout
  withTimeout(deleteDoc(doc(db, 'hives', hiveId)), 1200).catch((err) => {
    console.log('[HiveService] Hive deleted locally (cloud deferred):', err?.message);
  });

  return { success: true, id: hiveId };
}

export default {
  getUserHives,
  getHiveById,
  createHive,
  updateHive,
  deleteHive,
};
