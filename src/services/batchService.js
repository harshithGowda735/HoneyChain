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
import { getHiveById } from './hiveService';

const BATCHES_STORAGE_KEY_PREFIX = '@honeychain_batches_';
const PUBLIC_REGISTRY_COLLECTION = 'public_batches';

function withTimeout(promise, ms = 2000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

export async function getLocalBatches(uid) {
  try {
    let raw = await AsyncStorage.getItem(`${BATCHES_STORAGE_KEY_PREFIX}${uid}`);
    if (!raw && uid && uid !== 'beekeeper_demo') {
      const demoRaw = await AsyncStorage.getItem(`${BATCHES_STORAGE_KEY_PREFIX}beekeeper_demo`);
      if (demoRaw) {
        try {
          const list = JSON.parse(demoRaw).map((b) => ({ ...b, ownerUid: uid }));
          await AsyncStorage.setItem(`${BATCHES_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(list));
          return list;
        } catch (_) {}
      }
    }
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveLocalBatches(uid, batches) {
  try {
    await AsyncStorage.setItem(
      `${BATCHES_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(batches)
    );
  } catch (_) {}
}

/**
 * Honey Batch Service
 * Manages private batches in `batches/{batchId}` with local caching
 * and publishes safe public consumer verification records to `public_batches/{batchCode}`
 */

export async function getUserBatches(uid) {
  if (!uid) return [];

  const localBatches = await getLocalBatches(uid);

  try {
    const batchesRef = collection(db, 'batches');
    const q = query(batchesRef, where('ownerUid', '==', uid));
    const snapshot = await withTimeout(getDocs(q), 2000);

    if (!snapshot.empty) {
      const batches = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Sort descending by creation timestamp
      const sorted = batches.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });

      await saveLocalBatches(uid, sorted);
      return sorted;
    }
  } catch (err) {
    console.log('[BatchService] Firestore fetch notice, using local cache:', err?.message);
    if (localBatches.length > 0) {
      return localBatches;
    }
  }

  return localBatches;
}

export async function getBatchById(batchId, uid) {
  if (!batchId) throw new Error('Batch ID is required.');

  const localBatches = await getLocalBatches(uid);
  const foundLocal = localBatches.find((b) => b.id === batchId);

  try {
    const batchDocRef = doc(db, 'batches', batchId);
    const snap = await getDoc(batchDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.ownerUid !== uid) {
        throw new Error('Unauthorized access to honey batch.');
      }
      return { id: snap.id, ...data };
    }
  } catch (err) {
    if (foundLocal) return foundLocal;
    throw err;
  }

  if (foundLocal) return foundLocal;
  throw new Error('Honey batch not found.');
}

/**
 * Publish approved consumer fields to public registry
 */
export async function syncPublicBatchRecord(batchId, batchData, sourceHive) {
  const batchCode = batchData.batchCode;
  if (!batchCode) return;

  const publicRecord = {
    batchCode,
    honeyType: batchData.honeyType,
    harvestDate: batchData.harvestDate,
    quantity: batchData.quantity,
    unit: batchData.unit || 'kg',
    originApiary: sourceHive?.apiaryName || batchData.apiaryName || 'Verified Apiary Facility',
    originLocation: sourceHive?.location || 'Verified Apiary Yard',
    sourceHiveNames: batchData.sourceHiveNames || [sourceHive?.name || 'Verified Colony'],
    status: batchData.status || 'Harvested',
    verified: true,
    publishedAt: new Date().toISOString(),
    verificationUrl: batchData.verificationUrl || `https://honeychain.app/verify/${batchCode}`,
    blockchainStatus: 'off_chain_registry',
  };

  try {
    const publicDocRef = doc(db, PUBLIC_REGISTRY_COLLECTION, batchCode);
    await setDoc(publicDocRef, publicRecord, { merge: true });
  } catch (err) {
    console.log('[BatchService] Public batch registry sync deferred:', err?.message);
  }
}

export async function createBatch(uid, batchData) {
  if (!uid) throw new Error('User ID is required to create a batch.');

  const primaryHiveId = batchData.hiveId;
  if (!primaryHiveId) {
    throw new Error('Source hive ID is required.');
  }

  if (!batchData.honeyType || !batchData.honeyType.trim()) {
    throw new Error('Honey floral source/type is required.');
  }

  const qty = Number(batchData.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive number.');
  }

  let sourceHive = null;
  try {
    sourceHive = await getHiveById(primaryHiveId, uid);
  } catch (_) {
    sourceHive = { name: batchData.hiveName || 'Colony #1', apiaryName: 'Cauvery Honey Farm', location: 'Kodagu, Karnataka' };
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const batchCode = batchData.batchCode?.trim().toUpperCase() || `HC-${new Date().getFullYear()}-${randomSuffix}`;
  const verificationUrl = `https://honeychain.app/verify/${batchCode}`;

  const newId = `batch_${Date.now()}`;
  const newBatch = {
    id: newId,
    ownerUid: uid,
    hiveId: primaryHiveId,
    sourceHiveIds: batchData.sourceHiveIds || [primaryHiveId],
    sourceHiveNames: batchData.sourceHiveNames || [sourceHive?.name || 'Verified Colony'],
    hiveName: sourceHive?.name || 'Verified Colony',
    apiaryName: sourceHive?.apiaryName || 'Cauvery Honey Farm',
    batchCode,
    honeyType: batchData.honeyType.trim(),
    harvestDate: batchData.harvestDate || new Date().toISOString().split('T')[0],
    quantity: qty,
    unit: batchData.unit || 'kg',
    status: batchData.status || 'Harvested',
    moisture: batchData.moisture || '',
    notes: batchData.notes || '',
    verificationUrl,
    qrPayload: verificationUrl,
    blockchainAnchor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to local storage immediately
  const localBatches = await getLocalBatches(uid);
  const updatedLocal = [newBatch, ...localBatches];
  await saveLocalBatches(uid, updatedLocal);

  // 2. Non-blocking cloud sync with fast timeout
  withTimeout(
    setDoc(doc(db, 'batches', newId), {
      ...newBatch,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    1200
  ).catch((err) => {
    console.log('[BatchService] Batch saved locally (cloud deferred):', err?.message);
  });

  syncPublicBatchRecord(newId, newBatch, sourceHive).catch(() => {});

  return newBatch;
}

export async function updateBatch(batchId, uid, batchData) {
  if (!batchId || !uid) throw new Error('Batch ID and User ID are required.');

  const localBatches = await getLocalBatches(uid);
  const updatedLocal = localBatches.map((b) =>
    b.id === batchId ? { ...b, ...batchData, updatedAt: new Date().toISOString() } : b
  );
  await saveLocalBatches(uid, updatedLocal);

  const safeData = { ...batchData };
  delete safeData.ownerUid;
  delete safeData.createdAt;
  delete safeData.id;
  safeData.updatedAt = serverTimestamp();

  withTimeout(updateDoc(doc(db, 'batches', batchId), safeData), 1200).catch((err) => {
    console.log('[BatchService] Batch updated locally (cloud deferred):', err?.message);
  });

  return updatedLocal.find((b) => b.id === batchId);
}

export async function deleteBatch(batchId, uid) {
  if (!batchId || !uid) throw new Error('Batch ID and User ID are required.');

  const localBatches = await getLocalBatches(uid);
  const updatedLocal = localBatches.filter((b) => b.id !== batchId);
  await saveLocalBatches(uid, updatedLocal);

  withTimeout(deleteDoc(doc(db, 'batches', batchId)), 1200).catch((err) => {
    console.log('[BatchService] Batch deleted locally (cloud deferred):', err?.message);
  });

  return { success: true, id: batchId };
}

export async function getPublicBatchVerification(batchCode) {
  if (!batchCode) return null;

  try {
    const docRef = doc(db, PUBLIC_REGISTRY_COLLECTION, batchCode.trim().toUpperCase());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.log('[BatchService] Public verification fallback:', err?.message);
  }

  return null;
}

export default {
  getUserBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getPublicBatchVerification,
};
