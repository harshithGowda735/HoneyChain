import { Platform } from 'react-native';
import { auth } from './firebase';

const DEFAULT_SERVER_URL = Platform.select({
  android: 'http://10.81.13.190:3001',
  ios: 'http://10.81.13.190:3001',
  default: 'http://localhost:3001',
});

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_VOICE_BACKEND_URL ||
  DEFAULT_SERVER_URL;

/**
 * Checks if the HoneyChain AI Voice Support backend is reachable.
 * @param {number} timeoutMs
 * @returns {Promise<{ isHealthy: boolean, details?: object, error?: string }>}
 */
export async function checkBackendHealth(timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return { isHealthy: true, details: data };
    }
    return { isHealthy: false, error: `Server returned status ${res.status}` };
  } catch (err) {
    clearTimeout(timer);
    return {
      isHealthy: false,
      error: 'Server not reachable. Please make sure the HoneyChain backend is running.',
    };
  }
}

/**
 * Executes a network fetch with timeout and 1 automatic retry
 */
async function fetchWithRetry(url, options = {}, timeoutMs = 12000, retries = 1) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt <= retries) {
        // Wait 800ms before single retry
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  throw new Error('Server not reachable. Please make sure the HoneyChain backend is running.');
}

/**
 * Sends a recorded audio file to the Talk to HoneyChain backend.
 * Uses base64 encoding via expo-file-system to guarantee 100% compatibility
 * across React Native's modern fetch and WinterCG networking stacks.
 *
 * @param {string} audioUri - Local file URI of the recorded audio (m4a, aac, or wav)
 * @param {string} language - Language code ('kn-IN', 'hi-IN', 'en-IN')
 * @returns {Promise<object>} Voice turn response
 */
export async function sendVoiceTurn(audioUri, language = 'kn-IN') {
  if (!audioUri) {
    throw new Error('No audio file provided to send.');
  }

  // 1. Get Firebase ID Token if logged in
  let idToken = '';
  let clientUid = '';
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      clientUid = currentUser.uid;
      idToken = await currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('[VoiceSupportService] Could not retrieve ID token:', err?.message);
  }

  const endpoint = `${BACKEND_URL}/api/voice-support/process`;
  console.log(`[VoiceSupportService] Submitting voice turn to: ${endpoint}`);

  // 2. Read audio file to Base64 using expo-file-system
  let base64Audio = '';
  try {
    const FileSystem = require('expo-file-system');
    if (FileSystem && typeof FileSystem.readAsStringAsync === 'function') {
      base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType?.Base64 || 'base64',
      });
    }
  } catch (fsErr) {
    console.warn('[VoiceSupportService] FileSystem base64 read warning:', fsErr?.message);
  }

  // 3. Post as JSON with timeout & retry (eliminates FormDataPart issues)
  if (base64Audio) {
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const mimeType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';

    const response = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          audioMimeType: mimeType,
          language,
          token: idToken,
          clientUid,
        }),
      },
      14000,
      1
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Voice server responded with ${response.status}: ${errText}`);
    }

    return await response.json();
  }

  // 4. Fallback to multipart FormData with timeout & retry
  const formData = new FormData();
  const filename = audioUri.split('/').pop() || 'recording.m4a';
  const fileType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';

  formData.append('audio', {
    uri: audioUri,
    name: filename,
    type: fileType,
  });
  formData.append('language', language);
  if (idToken) formData.append('token', idToken);
  if (clientUid) formData.append('clientUid', clientUid);

  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: formData,
    },
    14000,
    1
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Voice server responded with ${response.status}: ${errText}`);
  }

  return await response.json();
}

/**
 * Sends a text query directly to Talk to HoneyChain backend.
 *
 * @param {string} textQuery - Text question to ask
 * @param {string} language - Language code ('kn-IN', 'hi-IN', 'en-IN')
 * @returns {Promise<object>}
 */
export async function sendTextTurn(textQuery, language = 'kn-IN') {
  if (!textQuery || !textQuery.trim()) {
    throw new Error('Please enter a question to ask.');
  }

  let idToken = '';
  let clientUid = '';
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      clientUid = currentUser.uid;
      idToken = await currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('[VoiceSupportService] Could not retrieve ID token:', err?.message);
  }

  const endpoint = `${BACKEND_URL}/api/voice-support/process`;
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        textQuery,
        language,
        token: idToken,
        clientUid,
      }),
    },
    12000,
    1
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Voice server responded with ${response.status}: ${errText}`);
  }

  return await response.json();
}

/**
 * Submits a request for human support callback.
 */
export async function requestHumanCallback({
  transcript = '',
  preferredLanguage = 'kn-IN',
  reason = 'Beekeeper requested expert support',
  displayName = 'Beekeeper',
  phoneNumber = '',
}) {
  let idToken = '';
  let uid = '';
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      uid = currentUser.uid;
      idToken = await currentUser.getIdToken();
    }
  } catch (_) {}

  const endpoint = `${BACKEND_URL}/api/voice-support/callback`;
  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        uid,
        displayName,
        phoneNumber,
        transcript,
        preferredLanguage,
        reason,
      }),
    },
    8000,
    1
  );

  if (!response.ok) {
    throw new Error(`Failed to record callback request (${response.status})`);
  }

  return await response.json();
}

/**
 * Synthesizes text directly into Edge TTS neural speech MP3
 * @param {string} text
 * @param {string} language
 * @returns {Promise<{ audioBase64: string, mimeType: string } | null>}
 */
export async function synthesizeSpeech(text, language = 'kn-IN') {
  if (!text || !text.trim()) return null;
  const endpoint = `${BACKEND_URL}/api/voice-support/tts`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ text, language }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.log('[VoiceSupportService] synthesizeSpeech fallback notice:', err?.message);
  }
  return null;
}

export default {
  sendVoiceTurn,
  sendTextTurn,
  synthesizeSpeech,
  requestHumanCallback,
  checkBackendHealth,
  BACKEND_URL,
};
