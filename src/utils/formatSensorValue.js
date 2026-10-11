/**
 * Sensor Formatting & Threshold Helpers
 * Honeybee brood nest optimal ranges:
 * - Temperature: 32.0°C to 36.0°C (Core 34.5°C)
 * - Humidity: 50% to 65%
 */

export function formatTemperature(celsius, unit = 'C') {
  if (celsius === null || celsius === undefined) return '--';
  if (unit === 'F') {
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  return `${Number(celsius).toFixed(1)}°C`;
}

export function formatHumidity(rh) {
  if (rh === null || rh === undefined) return '--';
  return `${Math.round(rh)}%`;
}

export function formatWeight(kg) {
  if (kg === null || kg === undefined) return '--';
  return `${Number(kg).toFixed(1)} kg`;
}

export function formatBattery(pct) {
  if (pct === null || pct === undefined) return '--';
  return `${Math.round(pct)}%`;
}

export function getTemperatureStatus(celsius) {
  if (celsius >= 33.5 && celsius <= 36.0) return 'optimal';
  if ((celsius >= 32.0 && celsius < 33.5) || (celsius > 36.0 && celsius <= 37.5)) return 'warning';
  return 'critical';
}

export function getHumidityStatus(humidity) {
  if (humidity >= 50 && humidity <= 65) return 'optimal';
  if ((humidity >= 45 && humidity < 50) || (humidity > 65 && humidity <= 75)) return 'warning';
  return 'critical';
}

export default {
  formatTemperature,
  formatHumidity,
  formatWeight,
  formatBattery,
  getTemperatureStatus,
  getHumidityStatus,
};
