import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_STORAGE_KEY = '@honeychain_last_location';

let cachedLocation = null;

export const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Kerala',
  'Andhra Pradesh',
  'Telangana',
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Himachal Pradesh',
  'Other State',
];

/**
 * Detects current device / customer location using GPS and reverse-geocoding.
 * Returns { state, district, city, formatted, coords }
 */
export async function detectCurrentLocation(silent = false) {
  try {
    // 1. Check in-memory cache first if available
    if (cachedLocation) {
      return cachedLocation;
    }

    // 2. Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return await getSavedLocation();
    }

    // 3. Obtain GPS position with balanced accuracy
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };

    // 4. Reverse geocode to administrative region / city
    const geocoded = await Location.reverseGeocodeAsync(coords);

    if (geocoded && geocoded.length > 0) {
      const place = geocoded[0];
      const rawRegion = (place.region || place.subregion || '').toLowerCase();
      const matchedState = INDIAN_STATES.find((s) =>
        rawRegion.includes(s.toLowerCase())
      ) || place.region || 'Karnataka';

      const district = place.subregion || place.district || place.city || '';
      const city = place.city || place.subregion || '';
      const formatted = [city, matchedState].filter(Boolean).join(', ');

      const result = {
        state: matchedState,
        district,
        city,
        formatted: formatted || matchedState,
        coords,
        timestamp: Date.now(),
      };

      cachedLocation = result;
      try {
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(result));
      } catch (_) {}

      return result;
    }
  } catch (err) {
    if (!silent) {
      console.warn('[LocationService] Location detection notice:', err?.message);
    }
  }

  return await getSavedLocation();
}

/**
 * Retrieves last persisted location from AsyncStorage
 */
export async function getSavedLocation() {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedLocation = parsed;
      return parsed;
    }
  } catch (_) {}

  return {
    state: 'Karnataka',
    district: 'Kodagu',
    city: 'Madikeri',
    formatted: 'Kodagu, Karnataka',
    coords: null,
    isFallback: true,
  };
}

export default {
  detectCurrentLocation,
  getSavedLocation,
  INDIAN_STATES,
};
