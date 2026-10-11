import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Hive Service
 * Manages colony documents in `hives/{hiveId}`
 */

export async function getUserHives(uid) {
  if (!uid) throw new Error('User ID is required to fetch hives.');

  const hivesRef = collection(db, 'hives');
  const q = query(hivesRef, where('ownerUid', '==', uid));

  const snapshot = await getDocs(q);
  const hives = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  // Sort descending by creation timestamp in memory
  return hives.sort((a, b) => {
    const timeA = a.createdAt?.toMillis
      ? a.createdAt.toMillis()
      : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const timeB = b.createdAt?.toMillis
      ? b.createdAt.toMillis()
      : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return timeB - timeA;
  });
}

export async function getHiveById(hiveId, uid) {
  if (!hiveId) throw new Error('Hive ID is required.');
  const hiveDocRef = doc(db, 'hives', hiveId);
  const snap = await getDoc(hiveDocRef);

  if (!snap.exists()) {
    throw new Error('Hive not found.');
  }

  const data = snap.data();
  if (data.ownerUid !== uid) {
    throw new Error('Unauthorized access to hive.');
  }

  return { id: snap.id, ...data };
}

export async function createHive(uid, hiveData) {
  if (!uid) throw new Error('User ID is required to create a hive.');
  if (!hiveData.name || !hiveData.name.trim()) {
    throw new Error('Hive name is required.');
  }
  if (!hiveData.location || !hiveData.location.trim()) {
    throw new Error('Hive yard/location is required.');
  }

  const newHive = {
    ownerUid: uid,
    name: hiveData.name.trim(),
    location: hiveData.location.trim(),
    apiaryName: hiveData.apiaryName || 'Meadowbrook Apiary',
    status: hiveData.status || 'healthy',
    queenStatus: hiveData.queenStatus || 'Marked - Active',
    notes: hiveData.notes || '',
    framesCount: Number(hiveData.framesCount) || 10,
    honeySuperCount: Number(hiveData.honeySuperCount) || 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const hivesRef = collection(db, 'hives');
  const docRef = await addDoc(hivesRef, newHive);
  return { id: docRef.id, ...newHive };
}

export async function updateHive(hiveId, uid, hiveData) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // Verify ownership before modifying
  await getHiveById(hiveId, uid);

  const hiveDocRef = doc(db, 'hives', hiveId);

  // Security: prevent ownership transfer
  const safeData = { ...hiveData };
  delete safeData.ownerUid;
  delete safeData.createdAt;
  delete safeData.id;

  safeData.updatedAt = serverTimestamp();

  await updateDoc(hiveDocRef, safeData);
  return await getHiveById(hiveId, uid);
}

export async function deleteHive(hiveId, uid) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // Verify ownership before deleting
  await getHiveById(hiveId, uid);

  const hiveDocRef = doc(db, 'hives', hiveId);
  await deleteDoc(hiveDocRef);
  return { success: true, id: hiveId };
}

export default {
  getUserHives,
  getHiveById,
  createHive,
  updateHive,
  deleteHive,
};
