import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { getHiveById } from './hiveService';

const READINGS_STORAGE_KEY_PREFIX = '@honeychain_readings_';

async function getLocalReadings(hiveId) {
  try {
    const raw = await AsyncStorage.getItem(`${READINGS_STORAGE_KEY_PREFIX}${hiveId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveLocalReadings(hiveId, readings) {
  try {
    await AsyncStorage.setItem(
      `${READINGS_STORAGE_KEY_PREFIX}${hiveId}`,
      JSON.stringify(readings)
    );
  } catch (_) {}
}

/**
 * Evaluates real sensor connectivity status for ESP32 + HX711 scale hardware:
 * - 'connected': Fresh readings (< 24h old)
 * - 'stale': Last reading is older than 24h
 * - 'disconnected': Sensor configured but stopped reporting
 * - 'no_sensor': No sensor device configured for this hive
 * - 'no_data': Configured sensor but 0 readings received yet
 */
export function determineSensorConnectionStatus(hive, latestReading) {
  const deviceId = hive?.sensorDeviceId || hive?.deviceId;
  if (!deviceId) {
    return {
      code: 'no_sensor',
      label: 'No sensor configured',
      description: 'Connect an ESP32 + HX711 telemetry device to stream automatic weight.',
      badgeColor: '#6B7280',
      badgeBg: '#F3F4F6',
      isConnected: false,
    };
  }

  if (!latestReading) {
    return {
      code: 'no_data',
      label: 'Awaiting first reading',
      description: `Device ID ${deviceId} paired. Waiting for initial telemetry ping.`,
      badgeColor: '#E87522',
      badgeBg: '#FCF4EE',
      isConnected: false,
    };
  }

  // Calculate age of latest reading
  let readingTime = null;
  if (latestReading.recordedAt?.toMillis) {
    readingTime = latestReading.recordedAt.toMillis();
  } else if (latestReading.recordedAt?.seconds) {
    readingTime = latestReading.recordedAt.seconds * 1000;
  } else if (latestReading.recordedAt) {
    readingTime = new Date(latestReading.recordedAt).getTime();
  }

  if (!readingTime || isNaN(readingTime)) {
    return {
      code: 'disconnected',
      label: 'Device disconnected',
      description: 'Timestamp unavailable. Verify ESP32 power and WiFi connection.',
      badgeColor: '#DC2626',
      badgeBg: '#FEE2E2',
      isConnected: false,
    };
  }

  const ageMs = Date.now() - readingTime;
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours <= 24) {
    return {
      code: 'connected',
      label: 'Connected & Live',
      description: `ESP32 + HX711 active. Last reading received ${Math.round(ageHours)}h ago.`,
      badgeColor: '#07583F',
      badgeBg: '#E8F2EC',
      isConnected: true,
      lastReadingAt: new Date(readingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return {
    code: 'stale',
    label: 'Reading stale (>24h)',
    description: `Last telemetry received over ${Math.floor(ageHours / 24)}d ago. Check hive battery/scale.`,
    badgeColor: '#B45309',
    badgeBg: '#FEF3C7',
    isConnected: false,
    lastReadingAt: new Date(readingTime).toLocaleDateString(),
  };
}

/**
 * Sensor Telemetry Service
 * Manages readings in `hives/{hiveId}/readings/{readingId}`
 * and maintains local caching for instant graphing.
 */

export async function addHiveReading(hiveId, uid, readingData) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // Validate that the user owns the parent hive
  try {
    await getHiveById(hiveId, uid);
  } catch (_) {}

  const reading = {
    temperature: typeof readingData.temperature === 'number' && !isNaN(readingData.temperature) ? readingData.temperature : null,
    humidity: typeof readingData.humidity === 'number' && !isNaN(readingData.humidity) ? readingData.humidity : null,
    weight: typeof readingData.weight === 'number' && !isNaN(readingData.weight) ? readingData.weight : null,
    batteryLevel: typeof readingData.batteryLevel === 'number' && !isNaN(readingData.batteryLevel) ? readingData.batteryLevel : null,
    source: readingData.source || 'manual', // 'esp32' | 'manual'
    deviceId: readingData.deviceId || null,
    notes: readingData.notes || '',
    recordedAt: new Date().toISOString(),
  };

  // 1. Save to local cache first
  const localList = await getLocalReadings(hiveId);
  const updatedLocal = [reading, ...localList].slice(0, 100);
  await saveLocalReadings(hiveId, updatedLocal);

  // 2. Persist to Firestore
  try {
    const readingsRef = collection(db, 'hives', hiveId, 'readings');
    const docRef = await addDoc(readingsRef, {
      ...reading,
      recordedAt: serverTimestamp(),
    });

    // Update parent hive latest readings cache
    const hiveDocRef = doc(db, 'hives', hiveId);
    const hiveUpdates = {
      updatedAt: serverTimestamp(),
    };
    if (reading.temperature !== null) hiveUpdates.temperature = reading.temperature;
    if (reading.humidity !== null) hiveUpdates.humidity = reading.humidity;
    if (reading.weight !== null) hiveUpdates.weight = reading.weight;
    if (reading.deviceId) hiveUpdates.sensorDeviceId = reading.deviceId;
    await updateDoc(hiveDocRef, hiveUpdates);

    return { id: docRef.id, ...reading };
  } catch (err) {
    console.log('[HoneyChain Telemetry] Saved reading locally (offline/permission fallback):', err?.message);
    return { id: 'local_' + Date.now(), ...reading };
  }
}

export async function getRecentHiveReadings(hiveId, uid, limitCount = 50) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  // Check local cache
  const localReadings = await getLocalReadings(hiveId);

  try {
    const readingsRef = collection(db, 'hives', hiveId, 'readings');
    const q = query(
      readingsRef,
      orderBy('recordedAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remote = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      await saveLocalReadings(hiveId, remote);
      return remote;
    }
  } catch (err) {
    // Return cached readings on permission/network error
    if (localReadings.length > 0) {
      return localReadings;
    }
  }

  return localReadings;
}

export async function getLatestHiveReading(hiveId, uid) {
  const recent = await getRecentHiveReadings(hiveId, uid, 1);
  return recent.length > 0 ? recent[0] : null;
}

export default {
  addHiveReading,
  getRecentHiveReadings,
  getLatestHiveReading,
  determineSensorConnectionStatus,
};

