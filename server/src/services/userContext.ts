import { getAdminFirestore } from './firebase';
import { BeekeeperContext, HiveSummary } from '../types';

function withTimeout<T>(promise: Promise<T>, ms = 2500, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function fetchBeekeeperContext(uid: string): Promise<BeekeeperContext> {
  if (!uid) {
    throw new Error('User ID is required to fetch beekeeper context.');
  }

  const db = getAdminFirestore();

  // 1. Fetch User Profile
  let profileData: any = {};
  try {
    const profilePromise = db.collection('users').doc(uid).get().then(snap => snap.exists ? snap.data() : {});
    profileData = await withTimeout(profilePromise, 2000, {});
  } catch (err: any) {
    console.warn(`[UserContext] Profile read warning for ${uid}: ${err.message}`);
  }

  // 2. Fetch Hives owned by this Beekeeper
  const hivesList: HiveSummary[] = [];
  try {
    const hivesPromise = db.collection('hives').where('ownerUid', '==', uid).get();
    const hivesSnap = await withTimeout(hivesPromise, 2000, null);
    if (hivesSnap && !hivesSnap.empty) {
      for (const doc of hivesSnap.docs) {
        const data = doc.data();
        let weight = typeof data.weight === 'number' ? data.weight : (typeof data.latestWeight === 'number' ? data.latestWeight : null);
        let temperature = typeof data.temperature === 'number' ? data.temperature : null;
        let humidity = typeof data.humidity === 'number' ? data.humidity : null;

        hivesList.push({
          id: doc.id,
          name: data.name || 'Hive Box',
          status: data.status || 'healthy',
          weight,
          temperature,
          humidity,
          sensorDeviceId: data.sensorDeviceId || null,
          sensorStatus: data.sensorDeviceId ? (weight !== null ? 'Connected (Live)' : 'Configured (No data yet)') : 'No sensor',
          updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt)) : undefined,
        });
      }
    }
  } catch (err: any) {
    console.warn(`[UserContext] Hives query notice for ${uid}: ${err.message}`);
  }

  // 3. Fetch Recent Honey Batches
  const recentBatches: Array<{ batchCode: string; honeyType: string; quantity: number; harvestDate?: string }> = [];
  let totalHarvestKg = 0;

  try {
    const batchesPromise = db.collection('batches').where('ownerUid', '==', uid).get();
    const batchesSnap = await withTimeout(batchesPromise, 2000, null);
    if (batchesSnap && !batchesSnap.empty) {
      for (const doc of batchesSnap.docs) {
        const bData = doc.data();
        const qty = typeof bData.quantity === 'number' ? bData.quantity : 0;
        totalHarvestKg += qty;
        recentBatches.push({
          batchCode: bData.batchCode || doc.id,
          honeyType: bData.honeyType || 'Raw Honey',
          quantity: qty,
          harvestDate: bData.harvestDate,
        });
      }
    }
  } catch (err: any) {
    console.warn(`[UserContext] Batches query notice for ${uid}: ${err.message}`);
  }

  return {
    uid,
    displayName: profileData.displayName || profileData.name || 'Beekeeper',
    phoneNumber: profileData.phoneNumber || '',
    apiaryName: profileData.apiaryName || 'Cauvery Honey Farm',
    state: profileData.state || 'Karnataka',
    district: profileData.district || 'General',
    hivesCount: hivesList.length,
    hives: hivesList,
    totalHarvestKg: Math.round(totalHarvestKg * 10) / 10,
    recentBatches: recentBatches.slice(0, 5),
  };
}
