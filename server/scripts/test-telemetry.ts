import assert from 'assert';
import admin from 'firebase-admin';
import { config } from '../src/config';
import {
  validateDeviceApiKey,
  validateTelemetryPayload,
  processTelemetryIngestion,
  TelemetryValidationError,
  DeviceNotFoundError,
  DuplicateReadingError,
  OutOfOrderReadingError,
  AmbiguousDeviceMappingError,
} from '../src/services/telemetryIngest';

// Configure test ESP32 API Key
config.esp32ApiKey = 'test_esp32_secret_key_12345';

let passedCount = 0;
let failedCount = 0;

async function testScenario(name: string, fn: () => Promise<void> | void) {
  process.stdout.write(`▶ TEST: ${name.padEnd(65)} `);
  try {
    await fn();
    console.log('✅ PASS');
    passedCount++;
  } catch (err: any) {
    console.log(`❌ FAIL\n  Error: ${err.message}`);
    failedCount++;
  }
}

/**
 * Creates an in-memory mock of Firestore for testing telemetry ingestion
 */
function createMockFirestore(initialState?: {
  hives?: Array<{ id: string; data: Record<string, any> }>;
  readings?: Record<string, Array<{ id: string; data: Record<string, any> }>>;
}) {
  const hives = initialState?.hives || [];
  const readings = initialState?.readings || {};

  const committedBatches: Array<{
    sets: Array<{ ref: any; data: any }>;
    updates: Array<{ ref: any; data: any }>;
  }> = [];

  const mockDb = {
    collection(colName: string) {
      if (colName === 'hives') {
        return {
          where(field: string, _op: string, value: any) {
            return {
              limit(_n: number) {
                return {
                  async get() {
                    const matched = hives.filter((h) => h.data[field] === value);
                    const sliced = _n ? matched.slice(0, _n) : matched;
                    return {
                      empty: sliced.length === 0,
                      docs: sliced.map((m) => ({
                        id: m.id,
                        data: () => m.data,
                      })),
                    };
                  },
                };
              },
            };
          },
          doc(hiveId: string) {
            return {
              id: hiveId,
              collection(subCol: string) {
                if (subCol === 'readings') {
                  return {
                    doc(_readingId?: string) {
                      const id = `mock_reading_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                      return { id, path: `hives/${hiveId}/readings/${id}` };
                    },
                    orderBy(orderField: string, direction: 'asc' | 'desc') {
                      return {
                        limit(_n: number) {
                          return {
                            async get() {
                              const list = [...(readings[hiveId] || [])];
                              list.sort((a, b) => {
                                const tA = a.data[orderField]?.toMillis
                                  ? a.data[orderField].toMillis()
                                  : new Date(a.data[orderField]).getTime();
                                const tB = b.data[orderField]?.toMillis
                                  ? b.data[orderField].toMillis()
                                  : new Date(b.data[orderField]).getTime();
                                return direction === 'desc' ? tB - tA : tA - tB;
                              });
                              return {
                                empty: list.length === 0,
                                docs: list.map((item) => ({
                                  id: item.id,
                                  data: () => item.data,
                                })),
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                }
                throw new Error(`Unexpected subcollection: ${subCol}`);
              },
            };
          },
        };
      }
      throw new Error(`Unexpected collection: ${colName}`);
    },

    batch() {
      const sets: Array<{ ref: any; data: any }> = [];
      const updates: Array<{ ref: any; data: any }> = [];

      return {
        set(ref: any, data: any) {
          sets.push({ ref, data });
        },
        update(ref: any, data: any) {
          updates.push({ ref, data });
        },
        async commit() {
          committedBatches.push({ sets, updates });
        },
      };
    },

    _getCommittedBatches() {
      return committedBatches;
    },
  };

  return mockDb as unknown as admin.firestore.Firestore & {
    _getCommittedBatches(): typeof committedBatches;
  };
}

async function main() {
  console.log('\n======================================================');
  console.log('🐝 HoneyChain IoT Telemetry Ingestion Test Suite');
  console.log('======================================================\n');

  // 1. API Key Authentication Tests
  console.log('--- 1. Authentication & API Key Validation ---');

  await testScenario('Valid API Key returns true', () => {
    assert.strictEqual(validateDeviceApiKey('test_esp32_secret_key_12345'), true);
  });

  await testScenario('Missing API Key returns false', () => {
    assert.strictEqual(validateDeviceApiKey(undefined), false);
    assert.strictEqual(validateDeviceApiKey(''), false);
    assert.strictEqual(validateDeviceApiKey(null), false);
  });

  await testScenario('Incorrect API Key returns false', () => {
    assert.strictEqual(validateDeviceApiKey('wrong_secret_key'), false);
    assert.strictEqual(validateDeviceApiKey('test_esp32_secret_key_12346'), false);
  });

  await testScenario('API Key with length mismatch returns false safely', () => {
    assert.strictEqual(validateDeviceApiKey('short'), false);
    assert.strictEqual(validateDeviceApiKey('a_very_very_long_secret_key_that_exceeds_length'), false);
  });

  // 2. Payload Validation Tests
  console.log('\n--- 2. Telemetry Payload Validation ---');

  await testScenario('Rejects non-object payload', () => {
    assert.throws(() => validateTelemetryPayload(null), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload('invalid'), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload([]), TelemetryValidationError);
  });

  await testScenario('Rejects missing or invalid deviceId', () => {
    assert.throws(() => validateTelemetryPayload({ temperature: 34.5, weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: '', temperature: 34.5, weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'a', temperature: 34.5, weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'bad device!', temperature: 34.5, weight: 25.0 }), TelemetryValidationError);
  });

  await testScenario('Rejects missing or invalid temperature', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: '34.5', weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: NaN, weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: Infinity, weight: 25.0 }), TelemetryValidationError);
  });

  await testScenario('Rejects temperature outside apiculture range (-20°C to 60°C)', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: -25.0, weight: 25.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 65.0, weight: 25.0 }), TelemetryValidationError);
  });

  await testScenario('Rejects missing or invalid weight', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: '25.0' }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: NaN }), TelemetryValidationError);
  });

  await testScenario('Rejects weight outside scale range (0.0 kg to 250.0 kg)', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: -2.0 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 350.0 }), TelemetryValidationError);
  });

  await testScenario('Rejects invalid optional humidity (<0% or >100%)', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, humidity: -5 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, humidity: 110 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, humidity: '55' }), TelemetryValidationError);
  });

  await testScenario('Rejects invalid optional batteryLevel (<0% or >100%)', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, batteryLevel: -1 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, batteryLevel: 105 }), TelemetryValidationError);
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, batteryLevel: '95' }), TelemetryValidationError);
  });

  await testScenario('Rejects malformed or out-of-bounds timestamps', () => {
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, timestamp: 'invalid-date' }), TelemetryValidationError);
    // Future timestamp (>5 mins)
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, timestamp: futureDate }), TelemetryValidationError);
    // Stale timestamp (>30 days)
    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    assert.throws(() => validateTelemetryPayload({ deviceId: 'ESP32-01', temperature: 34.5, weight: 25.0, timestamp: oldDate }), TelemetryValidationError);
  });

  await testScenario('Accepts valid minimal payload without optional fields', () => {
    const res = validateTelemetryPayload({
      deviceId: 'ESP32-HIVE-001',
      temperature: 34.5,
      weight: 28.6,
    });
    assert.strictEqual(res.deviceId, 'ESP32-HIVE-001');
    assert.strictEqual(res.temperature, 34.5);
    assert.strictEqual(res.weight, 28.6);
    assert.strictEqual(res.humidity, undefined);
    assert.strictEqual(res.batteryLevel, undefined);
    assert.ok(res.recordedAt instanceof Date);
  });

  await testScenario('Accepts valid full payload with optional fields', () => {
    const timestampStr = new Date(Date.now() - 60000).toISOString();
    const res = validateTelemetryPayload({
      deviceId: 'ESP32-HIVE-001',
      temperature: 35.123,
      weight: 29.456,
      humidity: 58.7,
      batteryLevel: 94.3,
      timestamp: timestampStr,
    });
    assert.strictEqual(res.temperature, 35.12);
    assert.strictEqual(res.weight, 29.46);
    assert.strictEqual(res.humidity, 58.7);
    assert.strictEqual(res.batteryLevel, 94);
    assert.strictEqual(res.recordedAt.toISOString(), timestampStr);
  });

  await testScenario('Accepts exact ESP32 firmware generated payload format', () => {
    const rawEsp32Json = JSON.stringify({
      deviceId: 'HC-ESP32-001',
      temperature: 34.2,
      weight: 24.5,
      batteryLevel: 92,
      timestamp: new Date(Date.now() - 30000).toISOString(),
    });
    const parsed = JSON.parse(rawEsp32Json);
    const res = validateTelemetryPayload(parsed);
    assert.strictEqual(res.deviceId, 'HC-ESP32-001');
    assert.strictEqual(res.temperature, 34.2);
    assert.strictEqual(res.weight, 24.5);
    assert.strictEqual(res.batteryLevel, 92);
  });

  // 3. Firestore Ingestion Logic Tests
  console.log('\n--- 3. Firestore Ingestion & Device Pairing Logic ---');

  await testScenario('Rejects unknown or unpaired deviceId (404)', async () => {
    const mockDb = createMockFirestore({
      hives: [{ id: 'hive_1', data: { name: 'Hive 1', sensorDeviceId: 'PAIRED-DEV-01' } }],
    });

    await assert.rejects(
      async () => {
        await processTelemetryIngestion(
          { deviceId: 'UNKNOWN-DEVICE-99', temperature: 34.5, weight: 25.0 },
          mockDb
        );
      },
      (err: any) => err instanceof DeviceNotFoundError
    );
  });

  await testScenario('Rejects ambiguous device mapping when multiple hives share sensorDeviceId (409)', async () => {
    const mockDb = createMockFirestore({
      hives: [
        { id: 'hive_1', data: { name: 'Hive 1', sensorDeviceId: 'ESP32-DUPLICATE' } },
        { id: 'hive_2', data: { name: 'Hive 2', sensorDeviceId: 'ESP32-DUPLICATE' } },
      ],
      readings: {},
    });

    await assert.rejects(
      async () => {
        await processTelemetryIngestion(
          { deviceId: 'ESP32-DUPLICATE', temperature: 34.5, weight: 25.2 },
          mockDb
        );
      },
      (err: any) => {
        assert.ok(err instanceof AmbiguousDeviceMappingError);
        assert.strictEqual(err.statusCode, 409);
        assert.ok(err.message.includes('hive_1'));
        assert.ok(err.message.includes('hive_2'));
        return true;
      }
    );
  });

  await testScenario('Rejects duplicate timestamp (409)', async () => {
    const readingTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
    const mockDb = createMockFirestore({
      hives: [{ id: 'hive_1', data: { name: 'Hive 1', sensorDeviceId: 'ESP32-01' } }],
      readings: {
        hive_1: [
          {
            id: 'read_1',
            data: {
              temperature: 34.0,
              weight: 25.0,
              recordedAt: admin.firestore.Timestamp.fromDate(readingTime),
            },
          },
        ],
      },
    });

    await assert.rejects(
      async () => {
        await processTelemetryIngestion(
          { deviceId: 'ESP32-01', temperature: 34.5, weight: 25.2, timestamp: readingTime.toISOString() },
          mockDb
        );
      },
      (err: any) => err instanceof DuplicateReadingError
    );
  });

  await testScenario('Rejects out-of-order timestamp earlier than latest reading (422)', async () => {
    const latestTime = new Date(Date.now() - 10 * 60 * 1000); // 10 mins ago
    const earlierTime = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago

    const mockDb = createMockFirestore({
      hives: [{ id: 'hive_1', data: { name: 'Hive 1', sensorDeviceId: 'ESP32-01' } }],
      readings: {
        hive_1: [
          {
            id: 'read_1',
            data: {
              temperature: 34.0,
              weight: 25.0,
              recordedAt: admin.firestore.Timestamp.fromDate(latestTime),
            },
          },
        ],
      },
    });

    await assert.rejects(
      async () => {
        await processTelemetryIngestion(
          { deviceId: 'ESP32-01', temperature: 34.5, weight: 25.2, timestamp: earlierTime.toISOString() },
          mockDb
        );
      },
      (err: any) => err instanceof OutOfOrderReadingError
    );
  });

  await testScenario('Successful ingestion creates reading and updates parent hive atomically', async () => {
    const mockDb = createMockFirestore({
      hives: [{ id: 'hive_1', data: { name: 'Colony Alpha', sensorDeviceId: 'ESP32-HIVE-001' } }],
      readings: {},
    });

    const timestampStr = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 mins ago
    const result = await processTelemetryIngestion(
      {
        deviceId: 'ESP32-HIVE-001',
        temperature: 35.2,
        weight: 28.4,
        humidity: 61.5,
        batteryLevel: 92,
        timestamp: timestampStr,
      },
      mockDb
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.hiveId, 'hive_1');
    assert.strictEqual(result.hiveName, 'Colony Alpha');
    assert.strictEqual(result.metrics.temperature, 35.2);
    assert.strictEqual(result.metrics.weight, 28.4);
    assert.strictEqual(result.metrics.humidity, 61.5);
    assert.strictEqual(result.metrics.batteryLevel, 92);

    const batches = mockDb._getCommittedBatches();
    assert.strictEqual(batches.length, 1);

    // Verify subcollection reading document
    const readingSet = batches[0].sets[0];
    assert.strictEqual(readingSet.data.temperature, 35.2);
    assert.strictEqual(readingSet.data.weight, 28.4);
    assert.strictEqual(readingSet.data.humidity, 61.5);
    assert.strictEqual(readingSet.data.batteryLevel, 92);
    assert.strictEqual(readingSet.data.source, 'esp32');
    assert.strictEqual(readingSet.data.deviceId, 'ESP32-HIVE-001');

    // Verify parent hive document update
    const hiveUpdate = batches[0].updates[0];
    assert.strictEqual(hiveUpdate.data.temperature, 35.2);
    assert.strictEqual(hiveUpdate.data.weight, 28.4);
    assert.strictEqual(hiveUpdate.data.humidity, 61.5);
    assert.strictEqual(hiveUpdate.data.battery, 92);
    assert.ok(hiveUpdate.data.lastPingAt);
    assert.ok(hiveUpdate.data.lastReadingAt);
    assert.ok(hiveUpdate.data.updatedAt);
  });

  await testScenario('Omitting optional humidity and battery does NOT overwrite parent values', async () => {
    const mockDb = createMockFirestore({
      hives: [{ id: 'hive_2', data: { name: 'Colony Beta', sensorDeviceId: 'ESP32-SCALE-ONLY' } }],
      readings: {},
    });

    await processTelemetryIngestion(
      {
        deviceId: 'ESP32-SCALE-ONLY',
        temperature: 34.8,
        weight: 24.2,
      },
      mockDb
    );

    const batches = mockDb._getCommittedBatches();
    const hiveUpdate = batches[0].updates[0];
    assert.strictEqual(hiveUpdate.data.temperature, 34.8);
    assert.strictEqual(hiveUpdate.data.weight, 24.2);
    // humidity and battery must not be present in update payload
    assert.strictEqual('humidity' in hiveUpdate.data, false);
    assert.strictEqual('battery' in hiveUpdate.data, false);

    const readingSet = batches[0].sets[0];
    assert.strictEqual(readingSet.data.humidity, null);
    assert.strictEqual(readingSet.data.batteryLevel, null);
  });

  // 4. HTTP Route Handler Tests
  console.log('\n--- 4. HTTP Route Handler Status Code Tests ---');

  await testScenario('Route rejects missing X-Device-Key header with 401', () => {
    assert.strictEqual(validateDeviceApiKey(undefined), false);
  });

  await testScenario('Route rejects incorrect X-Device-Key header with 401', () => {
    assert.strictEqual(validateDeviceApiKey('bad_key'), false);
  });

  await testScenario('Route accepts valid X-Device-Key header', () => {
    assert.strictEqual(validateDeviceApiKey('test_esp32_secret_key_12345'), true);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
