import crypto from 'crypto';
import admin from 'firebase-admin';
import { config } from '../config';
import { getAdminFirestore } from './firebase';
import { IngestTelemetryPayload, IngestTelemetryResult } from '../types';

/**
 * Domain error classes for Telemetry Ingestion
 */
export class TelemetryValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'TelemetryValidationError';
  }
}

export class DeviceNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(deviceId: string) {
    super(`Device '${deviceId}' is not registered or paired with any hive.`);
    this.name = 'DeviceNotFoundError';
  }
}

export class OutOfOrderReadingError extends Error {
  public readonly statusCode = 422;
  constructor(incomingDate: Date, latestDate: Date) {
    super(
      `Out-of-order telemetry: incoming timestamp (${incomingDate.toISOString()}) is older than the latest recorded reading (${latestDate.toISOString()}).`
    );
    this.name = 'OutOfOrderReadingError';
  }
}

export class DuplicateReadingError extends Error {
  public readonly statusCode = 409;
  constructor(timestamp: Date) {
    super(`Duplicate telemetry reading: a reading with timestamp ${timestamp.toISOString()} already exists.`);
    this.name = 'DuplicateReadingError';
  }
}

/**
 * Validates the X-Device-Key header using timing-safe comparison.
 * Never logs the API key or leaks length differences via early exit timing.
 */
export function validateDeviceApiKey(clientKey: string | undefined | null): boolean {
  if (!config.esp32ApiKey || !clientKey || typeof clientKey !== 'string') {
    return false;
  }

  const expectedBuffer = Buffer.from(config.esp32ApiKey, 'utf-8');
  const actualBuffer = Buffer.from(clientKey, 'utf-8');

  // Length mismatch check with constant-time dummy comparison to mitigate timing leak
  if (expectedBuffer.length !== actualBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export interface ValidatedTelemetryData {
  deviceId: string;
  temperature: number;
  weight: number;
  recordedAt: Date;
  humidity?: number;
  batteryLevel?: number;
}

/**
 * Validates the raw incoming telemetry payload against physical apiculture thresholds.
 */
export function validateTelemetryPayload(raw: any): ValidatedTelemetryData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TelemetryValidationError('Invalid payload: expected JSON object.');
  }

  // 1. Device ID
  if (!raw.deviceId || typeof raw.deviceId !== 'string') {
    throw new TelemetryValidationError('Missing or invalid required field: deviceId.');
  }
  const deviceId = raw.deviceId.trim();
  if (deviceId.length < 2 || deviceId.length > 64) {
    throw new TelemetryValidationError('deviceId must be between 2 and 64 characters.');
  }
  if (!/^[a-zA-Z0-9:_-]+$/.test(deviceId)) {
    throw new TelemetryValidationError('deviceId contains invalid characters. Use alphanumeric, colons, dashes or underscores.');
  }

  // 2. Temperature (required)
  if (raw.temperature === undefined || raw.temperature === null) {
    throw new TelemetryValidationError('Missing required field: temperature.');
  }
  if (typeof raw.temperature !== 'number' || Number.isNaN(raw.temperature) || !Number.isFinite(raw.temperature)) {
    throw new TelemetryValidationError('Invalid temperature value: must be a finite number.');
  }
  // Realistic apiculture temperature range (-20°C to 60°C)
  if (raw.temperature < -20 || raw.temperature > 60) {
    throw new TelemetryValidationError(`Temperature ${raw.temperature}°C is outside the realistic apiculture range (-20°C to 60°C).`);
  }

  // 3. Weight (required)
  if (raw.weight === undefined || raw.weight === null) {
    throw new TelemetryValidationError('Missing required field: weight.');
  }
  if (typeof raw.weight !== 'number' || Number.isNaN(raw.weight) || !Number.isFinite(raw.weight)) {
    throw new TelemetryValidationError('Invalid weight value: must be a finite number.');
  }
  // Realistic hive scale range (0.0 kg to 250.0 kg)
  if (raw.weight < 0 || raw.weight > 250) {
    throw new TelemetryValidationError(`Weight ${raw.weight} kg is outside the realistic hive scale range (0.0 kg to 250.0 kg).`);
  }

  // 4. Humidity (optional)
  let humidity: number | undefined;
  if (raw.humidity !== undefined && raw.humidity !== null) {
    if (typeof raw.humidity !== 'number' || Number.isNaN(raw.humidity) || !Number.isFinite(raw.humidity)) {
      throw new TelemetryValidationError('Invalid humidity value: must be a finite number.');
    }
    if (raw.humidity < 0 || raw.humidity > 100) {
      throw new TelemetryValidationError(`Humidity ${raw.humidity}% is outside valid range (0% to 100%).`);
    }
    humidity = raw.humidity;
  }

  // 5. Battery Level (optional)
  let batteryLevel: number | undefined;
  if (raw.batteryLevel !== undefined && raw.batteryLevel !== null) {
    if (typeof raw.batteryLevel !== 'number' || Number.isNaN(raw.batteryLevel) || !Number.isFinite(raw.batteryLevel)) {
      throw new TelemetryValidationError('Invalid batteryLevel value: must be a finite number.');
    }
    if (raw.batteryLevel < 0 || raw.batteryLevel > 100) {
      throw new TelemetryValidationError(`Battery level ${raw.batteryLevel}% is outside valid range (0% to 100%).`);
    }
    batteryLevel = raw.batteryLevel;
  }

  // 6. Timestamp (optional, defaults to current time)
  let recordedAt = new Date();
  if (raw.timestamp !== undefined && raw.timestamp !== null) {
    const parsed = new Date(raw.timestamp);
    if (Number.isNaN(parsed.getTime())) {
      throw new TelemetryValidationError('Invalid timestamp format: must be valid ISO 8601 string or numeric timestamp.');
    }

    const now = Date.now();
    // Allow up to 5 minutes clock drift into the future
    if (parsed.getTime() > now + 5 * 60 * 1000) {
      throw new TelemetryValidationError('Timestamp cannot be in the future.');
    }
    // Reject timestamps older than 30 days
    if (parsed.getTime() < now - 30 * 24 * 60 * 60 * 1000) {
      throw new TelemetryValidationError('Timestamp is too old (exceeds 30-day ingestion window).');
    }

    recordedAt = parsed;
  }

  return {
    deviceId,
    temperature: Number(raw.temperature.toFixed(2)),
    weight: Number(raw.weight.toFixed(2)),
    recordedAt,
    ...(humidity !== undefined ? { humidity: Number(humidity.toFixed(1)) } : {}),
    ...(batteryLevel !== undefined ? { batteryLevel: Math.round(batteryLevel) } : {}),
  };
}

/**
 * Ingests validated ESP32 telemetry into Firestore with atomic consistency.
 *
 * @param payload Raw payload from HTTP request
 * @param firestoreInstance Optional injected Firestore (for mocking in unit tests)
 */
export async function processTelemetryIngestion(
  payload: IngestTelemetryPayload,
  firestoreInstance?: admin.firestore.Firestore
): Promise<IngestTelemetryResult> {
  const db = firestoreInstance || getAdminFirestore();

  // 1. Strict Payload Validation
  const validated = validateTelemetryPayload(payload);

  // 2. Resolve Hive through registered sensorDeviceId
  const hivesSnap = await db
    .collection('hives')
    .where('sensorDeviceId', '==', validated.deviceId)
    .limit(1)
    .get();

  let targetHiveDoc: admin.firestore.DocumentSnapshot | null = null;

  if (!hivesSnap.empty) {
    targetHiveDoc = hivesSnap.docs[0];
  } else {
    // Check fallback deviceId field
    const fallbackSnap = await db
      .collection('hives')
      .where('deviceId', '==', validated.deviceId)
      .limit(1)
      .get();

    if (!fallbackSnap.empty) {
      targetHiveDoc = fallbackSnap.docs[0];
    }
  }

  if (!targetHiveDoc) {
    throw new DeviceNotFoundError(validated.deviceId);
  }

  const hiveId = targetHiveDoc.id;
  const hiveData = targetHiveDoc.data() || {};

  // 3. Out-of-order & Duplicate Check against latest reading
  const latestReadingsSnap = await db
    .collection('hives')
    .doc(hiveId)
    .collection('readings')
    .orderBy('recordedAt', 'desc')
    .limit(1)
    .get();

  if (!latestReadingsSnap.empty) {
    const latestDoc = latestReadingsSnap.docs[0].data();
    let latestMs = 0;
    if (latestDoc.recordedAt?.toMillis) {
      latestMs = latestDoc.recordedAt.toMillis();
    } else if (latestDoc.recordedAt?.seconds) {
      latestMs = latestDoc.recordedAt.seconds * 1000;
    } else if (latestDoc.recordedAt) {
      latestMs = new Date(latestDoc.recordedAt).getTime();
    }

    const incomingMs = validated.recordedAt.getTime();

    if (latestMs > 0) {
      if (incomingMs === latestMs) {
        throw new DuplicateReadingError(validated.recordedAt);
      }
      if (incomingMs < latestMs) {
        throw new OutOfOrderReadingError(validated.recordedAt, new Date(latestMs));
      }
    }
  }

  // 4. Batched Firestore Write for Atomic Consistency
  const batch = db.batch();

  // A. Subcollection: hives/{hiveId}/readings/{readingId}
  const readingRef = db.collection('hives').doc(hiveId).collection('readings').doc();
  const readingData: Record<string, any> = {
    id: readingRef.id,
    temperature: validated.temperature,
    weight: validated.weight,
    humidity: validated.humidity !== undefined ? validated.humidity : null,
    batteryLevel: validated.batteryLevel !== undefined ? validated.batteryLevel : null,
    source: 'esp32',
    deviceId: validated.deviceId,
    recordedAt: admin.firestore.Timestamp.fromDate(validated.recordedAt),
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  batch.set(readingRef, readingData);

  // B. Parent Hive Document: hives/{hiveId}
  const hiveUpdateData: Record<string, any> = {
    temperature: validated.temperature,
    weight: validated.weight,
    lastReadingAt: admin.firestore.Timestamp.fromDate(validated.recordedAt),
    lastPingAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Only update humidity if supplied by hardware
  if (validated.humidity !== undefined) {
    hiveUpdateData.humidity = validated.humidity;
  }

  // Update battery level if supplied by hardware
  if (validated.batteryLevel !== undefined) {
    hiveUpdateData.battery = validated.batteryLevel;
  }

  batch.update(db.collection('hives').doc(hiveId), hiveUpdateData);

  await batch.commit();

  return {
    success: true,
    message: 'Telemetry recorded successfully',
    hiveId,
    hiveName: hiveData.name || hiveId,
    readingId: readingRef.id,
    recordedAt: validated.recordedAt.toISOString(),
    metrics: {
      temperature: validated.temperature,
      weight: validated.weight,
      ...(validated.humidity !== undefined ? { humidity: validated.humidity } : {}),
      ...(validated.batteryLevel !== undefined ? { batteryLevel: validated.batteryLevel } : {}),
    },
  };
}

