import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getHiveById } from './hiveService';

/**
 * Sensor Telemetry Service
 * Manages readings in `hives/{hiveId}/readings/{readingId}`
 */

export async function addHiveReading(hiveId, uid, readingData) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // Validate that the user owns the parent hive
  await getHiveById(hiveId, uid);

  const reading = {
    temperature: typeof readingData.temperature === 'number' ? readingData.temperature : null,
    humidity: typeof readingData.humidity === 'number' ? readingData.humidity : null,
    weight: typeof readingData.weight === 'number' ? readingData.weight : null,
    batteryLevel: typeof readingData.batteryLevel === 'number' ? readingData.batteryLevel : null,
    source: readingData.source || 'manual', // 'esp32' | 'manual'
    notes: readingData.notes || '',
    recordedAt: serverTimestamp(),
  };

  const readingsRef = collection(db, 'hives', hiveId, 'readings');
  const docRef = await addDoc(readingsRef, reading);
  return { id: docRef.id, ...reading };
}

export async function getRecentHiveReadings(hiveId, uid, limitCount = 10) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // Verify ownership
  await getHiveById(hiveId, uid);

  const readingsRef = collection(db, 'hives', hiveId, 'readings');
  const q = query(
    readingsRef,
    orderBy('recordedAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function getLatestHiveReading(hiveId, uid) {
  const recent = await getRecentHiveReadings(hiveId, uid, 1);
  return recent.length > 0 ? recent[0] : null;
}

export default {
  addHiveReading,
  getRecentHiveReadings,
  getLatestHiveReading,
};
