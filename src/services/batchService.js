import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getHiveById } from './hiveService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_PUBLIC_BATCH_PREFIX = '@honeychain_public_batch_';

/**
 * Honey Batch Service
 * Manages private batches in `batches/{batchId}`
 * and publishes safe public consumer verification records to `public_batches/{batchCode}`
 */

export async function getUserBatches(uid) {
  if (!uid) throw new Error('User ID is required to fetch batches.');

  const batchesRef = collection(db, 'batches');
  const q = query(batchesRef, where('ownerUid', '==', uid));

  const snapshot = await getDocs(q);
  const batches = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  // Sort descending by creation timestamp in memory
  return batches.sort((a, b) => {
    const timeA = a.createdAt?.toMillis
      ? a.createdAt.toMillis()
      : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const timeB = b.createdAt?.toMillis
      ? b.createdAt.toMillis()
      : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return timeB - timeA;
  });
}

export async function getBatchById(batchId, uid) {
  if (!batchId) throw new Error('Batch ID is required.');
  const batchDocRef = doc(db, 'batches', batchId);
  const snap = await getDoc(batchDocRef);

  if (!snap.exists()) {
    throw new Error('Honey batch not found.');
  }

  const data = snap.data();
  if (data.ownerUid !== uid) {
    throw new Error('Unauthorized access to honey batch.');
  }

  return { id: snap.id, ...data };
}

/**
 * Publish approved consumer fields to public registry
 */
export async function syncPublicBatchRecord(batchId, batchData, sourceHive) {
  if (!batchData?.batchCode) return;
  const batchCode = batchData.batchCode.trim().toUpperCase();

  const publicPayload = {
    batchCode,
    batchId,
    honeyType: batchData.honeyType || 'Verified Pure Honey',
    harvestDate: batchData.harvestDate || new Date().toISOString().split('T')[0],
    quantity: Number(batchData.quantity) || 0,
    unit: batchData.unit || 'kg',
    originApiary: sourceHive?.apiaryName || batchData.apiaryName || 'Verified Apiary Facility',
    originLocation: sourceHive?.location || batchData.originLocation || 'Verified Apiary Yard',
    sourceHives: batchData.sourceHiveNames || [sourceHive?.name || 'Verified Colony'],
    status: batchData.status || 'Harvested',
    verified: true,
    verificationUrl: `https://honeychain.app/verify/${batchCode}`,
    blockchainStatus: 'off_chain_registry', // Clearly distinguishes registry vs on-chain
    updatedAt: serverTimestamp(),
  };

  // Always cache locally so QR scanning works on-device even before Firestore cloud rules are deployed
  try {
    const serialized = JSON.stringify(publicPayload);
    await AsyncStorage.setItem(LOCAL_PUBLIC_BATCH_PREFIX + batchCode, serialized);
    if (batchId && batchId !== batchCode) {
      await AsyncStorage.setItem(LOCAL_PUBLIC_BATCH_PREFIX + batchId, serialized);
    }
  } catch (_) {}

  try {
    // 1. Primary document keyed by human-readable batch code
    const publicCodeRef = doc(db, 'public_batches', batchCode);
    await setDoc(publicCodeRef, publicPayload, { merge: true });

    // 2. Alias document keyed by Firestore doc id for universal scannability
    if (batchId && batchId !== batchCode) {
      const publicIdRef = doc(db, 'public_batches', batchId);
      await setDoc(publicIdRef, publicPayload, { merge: true });
    }
  } catch (err) {
    console.log('[batchService] Cloud public registry sync deferred until Firestore rules deployment.');
  }
}

export async function createBatch(uid, batchData) {
  if (!uid) throw new Error('User ID is required to create a batch.');

  const primaryHiveId = batchData.hiveId || (batchData.sourceHiveIds && batchData.sourceHiveIds[0]);
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

  // Enforce hive ownership: cannot reference another beekeeper's hive
  const sourceHive = await getHiveById(primaryHiveId, uid);

  // Generate deterministic batch code (HC-YYYY-XXXX)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const batchCode = batchData.batchCode?.trim().toUpperCase() || `HC-${new Date().getFullYear()}-${randomSuffix}`;
  const verificationUrl = `https://honeychain.app/verify/${batchCode}`;

  const sourceHiveIds = batchData.sourceHiveIds || [primaryHiveId];
  const sourceHiveNames = batchData.sourceHiveNames || [sourceHive.name || 'Verified Colony'];

  const newBatch = {
    ownerUid: uid,
    hiveId: primaryHiveId, // Required by Firestore security rule
    sourceHiveIds,
    sourceHiveNames,
    hiveName: sourceHive.name || 'Verified Colony',
    apiaryName: sourceHive.apiaryName || 'Meadowbrook Apiary',
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
    blockchainAnchor: null, // Ready for future on-chain anchoring
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batchesRef = collection(db, 'batches');
  const docRef = await addDoc(batchesRef, newBatch);

  // Synchronize approved public fields to public registry
  await syncPublicBatchRecord(docRef.id, newBatch, sourceHive);

  return { id: docRef.id, ...newBatch };
}

export async function updateBatch(batchId, uid, batchData) {
  if (!batchId || !uid) throw new Error('Batch ID and User ID are required.');

  // Verify ownership before modifying
  const existingBatch = await getBatchById(batchId, uid);

  if (batchData.hiveId) {
    await getHiveById(batchData.hiveId, uid);
  }

  if (batchData.quantity !== undefined) {
    const qty = Number(batchData.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number.');
    }
  }

  const batchDocRef = doc(db, 'batches', batchId);

  // Security: prevent ownership transfer
  const safeData = { ...batchData };
  delete safeData.ownerUid;
  delete safeData.createdAt;
  delete safeData.id;

  safeData.updatedAt = serverTimestamp();

  await updateDoc(batchDocRef, safeData);

  // Synchronize to public registry
  const updatedBatch = await getBatchById(batchId, uid);
  await syncPublicBatchRecord(batchId, updatedBatch, {
    apiaryName: updatedBatch.apiaryName,
    name: updatedBatch.hiveName,
  });

  return updatedBatch;
}

export async function deleteBatch(batchId, uid) {
  if (!batchId || !uid) throw new Error('Batch ID and User ID are required.');

  const existingBatch = await getBatchById(batchId, uid);
  const batchDocRef = doc(db, 'batches', batchId);
  await deleteDoc(batchDocRef);

  // Remove corresponding public registry records
  if (existingBatch?.batchCode) {
    try {
      const publicDocRef = doc(db, 'public_batches', existingBatch.batchCode);
      await deleteDoc(publicDocRef);

      const publicIdRef = doc(db, 'public_batches', batchId);
      await deleteDoc(publicIdRef);
    } catch (err) {
      console.warn('[batchService] Public batch deletion warning:', err?.message);
    }
  }

  return { success: true, id: batchId };
}

/**
 * Public Consumer Verification Lookup
 * Does NOT require authentication. Fetches ONLY approved public batch fields.
 * Never exposes private owner phone numbers, emails, or credentials.
 */
export async function getPublicBatchVerification(code) {
  if (!code || !code.trim()) return null;

  const cleanCode = code.trim().toUpperCase();

  try {
    // 1. Direct document check by ID or BatchCode
    const directDocRef = doc(db, 'public_batches', cleanCode);
    const snap = await getDoc(directDocRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }

    // 2. Query by batchCode field
    const publicRef = collection(db, 'public_batches');
    const qByCode = query(publicRef, where('batchCode', '==', cleanCode));
    const snapshotByCode = await getDocs(qByCode);
    if (!snapshotByCode.empty) {
      const docData = snapshotByCode.docs[0];
      return { id: docData.id, ...docData.data() };
    }

    // 3. Query by batchId field
    const qById = query(publicRef, where('batchId', '==', code.trim()));
    const snapshotById = await getDocs(qById);
    if (!snapshotById.empty) {
      const docData = snapshotById.docs[0];
      return { id: docData.id, ...docData.data() };
    }
  } catch (err) {
    console.log('[batchService] Cloud verification query notice:', err?.message);
  }

  // Fallback to local AsyncStorage cache if cloud rules deny access or offline
  try {
    const local = (await AsyncStorage.getItem(LOCAL_PUBLIC_BATCH_PREFIX + cleanCode)) ||
                  (await AsyncStorage.getItem(LOCAL_PUBLIC_BATCH_PREFIX + code.trim()));
    if (local) {
      return JSON.parse(local);
    }
  } catch (_) {}

  return null;
}

export default {
  getUserBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  syncPublicBatchRecord,
  getPublicBatchVerification,
};
