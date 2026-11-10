import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * HoneyChain Device / System Notification Service
 *
 * Sends native system notifications directly to the phone's notification shade,
 * heads-up banner, and lock screen (similar to SMS or Ather EV vehicle alerts).
 */

let isConfigured = false;

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Initializes notification permissions and Android channels.
 */
export async function initDeviceNotifications() {
  if (isConfigured) return true;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('colony_alerts', {
        name: 'HoneyChain Colony Alerts',
        description: 'Critical temperature warnings, recovery updates, and hive maintenance alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#E87522',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('harvest_suggestions', {
        name: 'HoneyChain Harvest Advisories',
        description: 'Honey storage gain and comb inspection advisories',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: '#10B981',
        sound: 'default',
      });
    }

    isConfigured = finalStatus === 'granted';
    return isConfigured;
  } catch (err) {
    console.log('[DeviceNotification] Init notification channel notice:', err?.message);
    return false;
  }
}

/**
 * Fires a native phone notification immediately to the phone's notification bar.
 *
 * @param {object} params
 * @param {string} params.title - Notification headline (e.g. "🚨 High Temperature in Hive 01")
 * @param {string} params.body - Notification body message
 * @param {string} [params.channelId] - Android notification channel ('colony_alerts' | 'harvest_suggestions')
 * @param {object} [params.data] - Custom payload
 */
export async function sendPhoneNotification({ title, body, channelId = 'colony_alerts', data = {} }) {
  try {
    await initDeviceNotifications();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null, // null trigger schedules immediately!
    });
    return true;
  } catch (err) {
    console.log('[DeviceNotification] Native schedule notice:', err?.message);
    return false;
  }
}

export default {
  initDeviceNotifications,
  sendPhoneNotification,
};

