/**
 * HoneyChain Backend API Client
 *
 * Configured for future connection to FastAPI & hardware gateways.
 * V1 business records (hives, batches, telemetry, user profiles) are managed
 * via Cloud Firestore services in `src/services/`.
 */

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  TIMEOUT_MS: 10000,
  STATUS: 'V1_FIRESTORE_ACTIVE',
};

/**
 * Placeholder for future FastAPI ESP32 hardware streaming endpoint.
 */
export async function fetchHiveTelemetry(hiveId) {
  throw new Error(
    `[HoneyChain API] Live hardware streaming gateway not yet active for ${hiveId}. Use sensorService instead.`
  );
}

/**
 * Placeholder for future external ledger verification endpoint.
 */
export async function fetchBatchTraceability(batchId) {
  throw new Error(
    `[HoneyChain API] External ledger verification client reserved for V2. Use batchService for ${batchId}.`
  );
}

export default {
  API_CONFIG,
  fetchHiveTelemetry,
  fetchBatchTraceability,
};
