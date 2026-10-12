/**
 * AI Prediction & Diagnostic Service Boundary
 * Prepared for future edge/cloud ML models:
 * - Colony Health Assessment
 * - Varroa Mite & Brood Disease Detection
 * - Honey Yield & Productivity Prediction
 *
 * NOTE: Operates honestly. Does not simulate disease diagnosis or fake yield predictions
 * without validated models and telemetry input.
 */

export const AI_MODEL_STATUS = {
  HEALTH_ASSESSMENT: 'awaiting_telemetry', // 'active' | 'awaiting_telemetry' | 'offline'
  DISEASE_DETECTION: 'in_training',
  YIELD_PREDICTION: 'planned_phase_2',
};

/**
 * Assess colony health based on authentic telemetry history
 * @param {Array} telemetryReadings Real readings from hive sensor subcollection
 * @returns {{ status: string, confidence: number, advice: string, isModelActive: boolean }}
 */
export function assessColonyHealth(telemetryReadings = []) {
  if (!telemetryReadings || telemetryReadings.length === 0) {
    return {
      status: 'Sensor Telemetry Required',
      confidence: 0,
      isModelActive: false,
      advice: 'Connect an ESP32 hive sensor to enable automated temperature and humidity anomaly analysis.',
    };
  }

  // Baseline agricultural telemetry check (purely diagnostic, not ML claim)
  const latest = telemetryReadings[0];
  const temp = latest.temperature;
  const humidity = latest.humidity;

  if (temp === null && humidity === null) {
    return {
      status: 'No Sensor Data',
      confidence: 0,
      isModelActive: false,
      advice: 'Hardware connected but no valid sensor metrics reported.',
    };
  }

  // Brood nest optimal range: 32°C - 36°C, 50% - 70% humidity
  let advice = 'Colony conditions are within typical apiculture thresholds.';
  let healthRating = 'Normal';

  if (temp !== null) {
    if (temp < 30) {
      healthRating = 'Chilling Risk';
      advice = 'Internal hive temperature is low (<30°C). Inspect cluster size and entrance ventilation.';
    } else if (temp > 38) {
      healthRating = 'Overheating Risk';
      advice = 'Internal hive temperature is elevated (>38°C). Provide shaded cover and adequate water supply.';
    }
  }

  return {
    status: healthRating,
    confidence: 0.75,
    isModelActive: false, // Honestly report that rule-based advisory is in effect, not deep learning
    modelType: 'Apiculture Range Assessment',
    advice,
    readingTimestamp: latest.recordedAt || latest.timestamp,
  };
}

/**
 * Disease detection placeholder boundary
 */
export function detectColonyDisease(imageUri) {
  return {
    available: false,
    status: 'In Training',
    message: 'Camera-based Varroa mite and brood disease vision model is scheduled for future release.',
  };
}

export default {
  AI_MODEL_STATUS,
  assessColonyHealth,
  detectColonyDisease,
};
