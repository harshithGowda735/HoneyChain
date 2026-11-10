import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNotification } from './notificationService';
import { sendPhoneNotification } from './deviceNotificationService';

const TEMP_STATE_STORAGE_KEY_PREFIX = '@honeychain_temp_states_';

/**
 * HoneyChain Temperature Threshold Configuration
 *
 * Apiculture Reference:
 * In a healthy honey bee colony, workers regulate the central brood nest within 32.0°C – 36.0°C.
 * - Sustained temperatures >= 38.0°C risk brood overheating and comb collapse.
 * - Sustained temperatures <= 29.0°C risk brood chilling and reduced worker longevity.
 *
 * Hysteresis Design:
 * - High alert triggers at >= 38.0°C. High recovery occurs only when cooling below 36.5°C.
 * - Low alert triggers at <= 29.0°C. Low recovery occurs only when warming above 31.5°C.
 * This 1.5°C–2.5°C hysteresis margin prevents flapping notifications caused by normal sensor jitter.
 */
export const DEFAULT_TEMP_CONFIG = {
  highThreshold: 38.0,
  highRecoveryThreshold: 36.5,
  lowThreshold: 29.0,
  lowRecoveryThreshold: 31.5,
  staleReadingMaxHours: 24,
};

/**
 * Temperature States:
 * - 'NORMAL'
 * - 'HIGH'
 * - 'LOW'
 * - 'UNKNOWN'
 */
export const TEMP_STATES = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Pure state transition evaluator.
 * Evaluates a single temperature observation against the previous state and hysteresis thresholds.
 *
 * @param {string} currentState - Current state ('NORMAL' | 'HIGH' | 'LOW' | 'UNKNOWN')
 * @param {number|null} temperature - Observed temperature in °C
 * @param {object} config - Threshold configuration
 * @returns {{ nextState: string, transition: string|null, title?: string, message?: string, severity?: string, type?: string }}
 */
export function evaluateTemperatureTransition(currentState, temperature, config = DEFAULT_TEMP_CONFIG) {
  const cfg = { ...DEFAULT_TEMP_CONFIG, ...config };

  // 1. Guard against missing or out-of-range sensor values
  if (
    typeof temperature !== 'number' ||
    isNaN(temperature) ||
    temperature < -20 ||
    temperature > 60
  ) {
    return {
      nextState: currentState || TEMP_STATES.UNKNOWN,
      transition: null,
    };
  }

  const effectiveState = currentState || TEMP_STATES.NORMAL;

  // 2. Evaluate State Transitions with Hysteresis
  switch (effectiveState) {
    case TEMP_STATES.NORMAL: {
      if (temperature >= cfg.highThreshold) {
        return {
          nextState: TEMP_STATES.HIGH,
          transition: 'NORMAL_TO_HIGH',
          type: 'temp_high',
          severity: 'critical',
          title: 'High Temperature Alert',
          message: `Elevated internal temperature (${temperature.toFixed(1)}°C) detected. Threshold: ${cfg.highThreshold}°C. Please inspect hive shade and entrance ventilation.`,
        };
      }
      if (temperature <= cfg.lowThreshold) {
        return {
          nextState: TEMP_STATES.LOW,
          transition: 'NORMAL_TO_LOW',
          type: 'temp_low',
          severity: 'warning',
          title: 'Low Temperature Alert',
          message: `Low internal temperature (${temperature.toFixed(1)}°C) detected. Threshold: ${cfg.lowThreshold}°C. Check cluster strength and reduce entrance size.`,
        };
      }
      return {
        nextState: TEMP_STATES.NORMAL,
        transition: null,
      };
    }

    case TEMP_STATES.HIGH: {
      // Must cool down past the hysteresis recovery threshold
      if (temperature <= cfg.highRecoveryThreshold) {
        return {
          nextState: TEMP_STATES.NORMAL,
          transition: 'HIGH_TO_NORMAL',
          type: 'temp_recovered',
          severity: 'success',
          title: 'Temperature Normalized',
          message: `Hive internal temperature has cooled to ${temperature.toFixed(1)}°C, returning to the normal brood nest range.`,
        };
      }
      // Temperature is still high — suppress duplicate alerts
      return {
        nextState: TEMP_STATES.HIGH,
        transition: null,
      };
    }

    case TEMP_STATES.LOW: {
      // Must warm up past the hysteresis recovery threshold
      if (temperature >= cfg.lowRecoveryThreshold) {
        return {
          nextState: TEMP_STATES.NORMAL,
          transition: 'LOW_TO_NORMAL',
          type: 'temp_recovered',
          severity: 'success',
          title: 'Temperature Normalized',
          message: `Hive internal temperature has warmed to ${temperature.toFixed(1)}°C, returning to the normal brood nest range.`,
        };
      }
      // Temperature is still low — suppress duplicate alerts
      return {
        nextState: TEMP_STATES.LOW,
        transition: null,
      };
    }

    case TEMP_STATES.UNKNOWN:
    default: {
      // Baseline initialization
      if (temperature >= cfg.highThreshold) {
        return {
          nextState: TEMP_STATES.HIGH,
          transition: 'INIT_HIGH',
          type: 'temp_high',
          severity: 'critical',
          title: 'High Temperature Alert',
          message: `Elevated internal temperature (${temperature.toFixed(1)}°C) detected on initial reading. Threshold: ${cfg.highThreshold}°C.`,
        };
      }
      if (temperature <= cfg.lowThreshold) {
        return {
          nextState: TEMP_STATES.LOW,
          transition: 'INIT_LOW',
          type: 'temp_low',
          severity: 'warning',
          title: 'Low Temperature Alert',
          message: `Low internal temperature (${temperature.toFixed(1)}°C) detected on initial reading. Threshold: ${cfg.lowThreshold}°C.`,
        };
      }
      return {
        nextState: TEMP_STATES.NORMAL,
        transition: null,
      };
    }
  }
}

/**
 * Retrieves persisted temperature states across app reloads.
 */
export async function getPersistedTempStates(uid) {
  if (!uid) return {};
  try {
    const raw = await AsyncStorage.getItem(`${TEMP_STATE_STORAGE_KEY_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Saves persisted temperature states.
 */
export async function savePersistedTempStates(uid, states) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(
      `${TEMP_STATE_STORAGE_KEY_PREFIX}${uid}`,
      JSON.stringify(states)
    );
  } catch (_) {}
}

/**
 * Checks whether a timestamp is older than max hours
 */
function isReadingStale(timestamp, maxHours) {
  if (!timestamp) return false; // If no timestamp provided, treat as current
  let ts = 0;
  if (timestamp?.toMillis) {
    ts = timestamp.toMillis();
  } else if (timestamp?.seconds) {
    ts = timestamp.seconds * 1000;
  } else {
    ts = new Date(timestamp).getTime();
  }
  if (!ts || isNaN(ts)) return false;
  const ageHours = (Date.now() - ts) / (1000 * 60 * 60);
  return ageHours > maxHours;
}

/**
 * Evaluates live telemetry for a list of hives and creates notifications
 * exclusively on genuine state transitions.
 *
 * Dedicated service: kept separate from UI rendering and subscription hooks.
 *
 * @param {string} uid - Authenticated user ID
 * @param {Array} hives - List of user hives with live telemetry properties
 * @param {object} customConfig - Optional beekeeper threshold overrides
 * @returns {Promise<Array>} Generated transition notifications (if any)
 */
export async function evaluateHivesTelemetry(uid, hives = [], customConfig = {}) {
  if (!uid || !Array.isArray(hives) || hives.length === 0) return [];

  const config = { ...DEFAULT_TEMP_CONFIG, ...customConfig };
  const currentStates = await getPersistedTempStates(uid);
  const updatedStates = { ...currentStates };
  const generatedNotifications = [];

  for (const hive of hives) {
    if (!hive || !hive.id) continue;

    const temp = typeof hive.temperature === 'number' ? hive.temperature : null;
    const readingTime = hive.updatedAt || hive.lastReading;

    // Skip stale readings (older than 24h) to prevent waking up old alarms
    if (isReadingStale(readingTime, config.staleReadingMaxHours)) {
      continue;
    }

    const previousHiveState = currentStates[hive.id]?.state || TEMP_STATES.UNKNOWN;
    const evaluation = evaluateTemperatureTransition(previousHiveState, temp, config);

    // If a state transition occurred
    if (evaluation.transition && evaluation.type) {
      // Deterministic deduplication ID: temp_{hiveId}_{transition}_{timestampBucket}
      const dateBucket = new Date().toISOString().slice(0, 13); // bucketed to hour
      const deterministicId = `temp_${hive.id}_${evaluation.transition}_${dateBucket}`;

      const notifPayload = {
        id: deterministicId,
        type: evaluation.type,
        severity: evaluation.severity,
        hiveId: hive.id,
        hiveName: hive.name || `Hive ${hive.id.slice(0, 6)}`,
        title: evaluation.title,
        message: `${hive.name || 'Colony'}: ${evaluation.message}`,
        data: {
          temperature: temp,
          previousState: previousHiveState,
          nextState: evaluation.nextState,
          transition: evaluation.transition,
        },
      };

      const created = await createNotification(uid, notifPayload);
      generatedNotifications.push(created);

      // Trigger native phone notification (SMS / Ather-style notification banner)
      sendPhoneNotification({
        title: evaluation.severity === 'critical' ? `🚨 ${evaluation.title}` : `🔔 ${evaluation.title}`,
        body: notifPayload.message,
        channelId: 'colony_alerts',
        data: notifPayload.data,
      });

      // Record new state
      updatedStates[hive.id] = {
        state: evaluation.nextState,
        lastTemp: temp,
        lastTransition: evaluation.transition,
        updatedAt: new Date().toISOString(),
      };
    } else if (evaluation.nextState !== previousHiveState) {
      // State updated quietly without notification
      updatedStates[hive.id] = {
        state: evaluation.nextState,
        lastTemp: temp,
        lastTransition: null,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // Persist updated state map
  await savePersistedTempStates(uid, updatedStates);
  return generatedNotifications;
}

export default {
  DEFAULT_TEMP_CONFIG,
  TEMP_STATES,
  evaluateTemperatureTransition,
  evaluateHivesTelemetry,
  getPersistedTempStates,
  savePersistedTempStates,
};

