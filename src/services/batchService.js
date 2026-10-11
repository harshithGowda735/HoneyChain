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

export async function createBatch(uid, batchData) {
  if (!uid) throw new Error('User ID is required to create a batch.');
  if (!batchData.hiveId) {
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
  const sourceHive = await getHiveById(batchData.hiveId, uid);

  // Generate a human-readable, stable batch code if not provided
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const batchCode = batchData.batchCode?.trim().toUpperCase() || `HC-${new Date().getFullYear()}-${randomSuffix}`;
  const verificationUrl = `https://honeychain.app/verify/${batchCode}`;

  const newBatch = {
    ownerUid: uid,
    hiveId: batchData.hiveId,
    hiveName: sourceHive.name || 'Verified Colony',
    apiaryName: sourceHive.apiaryName || 'Meadowbrook Apiary',
    batchCode,
    honeyType: batchData.honeyType.trim(),
    harvestDate: batchData.harvestDate || new Date().toISOString().split('T')[0],
    quantity: qty,
    unit: batchData.unit || 'kg',
    status: batchData.status || 'Harvested', // 'Harvested' | 'Extraction' | 'Settling' | 'Jarred' | 'Lab Certified'
    moisture: batchData.moisture || '',
    notes: batchData.notes || '',
    verificationUrl,
    qrPayload: verificationUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batchesRef = collection(db, 'batches');
  const docRef = await addDoc(batchesRef, newBatch);

  // Publish approved consumer fields to public_batches/{batchCode}
  try {
    const publicDocRef = doc(db, 'public_batches', batchCode);
    await setDoc(publicDocRef, {
      batchCode,
      batchId: docRef.id,
      honeyType: newBatch.honeyType,
      harvestDate: newBatch.harvestDate,
      quantity: newBatch.quantity,
      unit: newBatch.unit,
      originApiary: sourceHive.apiaryName || 'Certified Apiary Facility',
      originLocation: sourceHive.location || 'Verified Apiary Yard',
      status: newBatch.status,
      verified: true,
      verificationUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (publicErr) {
    console.warn('[batchService] Public batch registry sync warning:', publicErr?.message);
  }

  return { id: docRef.id, ...newBatch };
}

export async function updateBatch(batchId, uid, batchData) {
  if (!batchId || !uid) throw new Error('Batch ID and User ID are required.');

  // Verify ownership before modifying
  const existingBatch = await getBatchById(batchId, uid);

  // If hiveId is being updated, verify ownership of the new hive
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

  // Synchronize approved public fields to public_batches
  if (existingBatch?.batchCode) {
    try {
      const publicDocRef = doc(db, 'public_batches', existingBatch.batchCode);
      const publicUpdate = {};
      if (batchData.honeyType) publicUpdate.honeyType = batchData.honeyType.trim();
      if (batchData.quantity !== undefined) publicUpdate.quantity = Number(batchData.quantity);
      if (batchData.status) publicUpdate.status = batchData.status;
      if (batchData.harvestDate) publicUpdate.harvestDate = batchData.harvestDate;
      publicUpdate.updatedAt = serverTimestamp();
      await updateDoc(publicDocRef, publicUpdate);
    } catch (err) {
      console.warn('[batchService] Public batch update sync warning:', err?.message);
    }
  }

  return await getBatchById(batchId, uid);
}

export async function deleteBatch(batchId, uid) {
  if (!batchId || !uid) throw new Error('Batch ID and User ID are required.');

  // Verify ownership before deleting
  const existingBatch = await getBatchById(batchId, uid);

  const batchDocRef = doc(db, 'batches', batchId);
  await deleteDoc(batchDocRef);

  // Remove corresponding public record
  if (existingBatch?.batchCode) {
    try {
      const publicDocRef = doc(db, 'public_batches', existingBatch.batchCode);
      await deleteDoc(publicDocRef);
    } catch (err) {
      console.warn('[batchService] Public batch deletion warning:', err?.message);
    }
  }

  return { success: true, id: batchId };
}

/**
 * Public Consumer Verification Lookup
 * Does NOT require authentication. Fetches only approved public batch fields.
 */
export async function getPublicBatchVerification(batchCode) {
  if (!batchCode || !batchCode.trim()) return null;

  const cleanCode = batchCode.trim().toUpperCase();
  const publicDocRef = doc(db, 'public_batches', cleanCode);
  const snap = await getDoc(publicDocRef);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export default {
  getUserBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getPublicBatchVerification,
};
