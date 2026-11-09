/**
 * Native Audio Bridge
 *
 * Safely abstracts audio recording, audio file playback (base64 MP3),
 * and text-to-speech fallback across Expo Go and Custom Development builds.
 * Never crashes if native audio components differ between client environments.
 */

let expoAudio = null;
let expoSpeech = null;
let audioInitAttempted = false;
let speechInitAttempted = false;
let activeAudioPlayer = null;
let activePlaybackTimer = null;

export function getExpoAudio() {
  if (!audioInitAttempted) {
    audioInitAttempted = true;
    try {
      expoAudio = require('expo-audio');
    } catch (err) {
      console.warn('[NativeAudioBridge] expo-audio is not available in this client binary:', err?.message);
      expoAudio = null;
    }
  }
  return expoAudio;
}

export function getExpoSpeech() {
  if (!speechInitAttempted) {
    speechInitAttempted = true;
    try {
      expoSpeech = require('expo-speech');
    } catch (err) {
      console.warn('[NativeAudioBridge] expo-speech is not available in this client binary:', err?.message);
      expoSpeech = null;
    }
  }
  return expoSpeech;
}

export function isRecordingSupported() {
  const mod = getExpoAudio();
  return Boolean(mod && (mod.AudioModule || typeof mod.useAudioRecorder === 'function'));
}

export function isSpeechSupported() {
  const mod = getExpoSpeech();
  return Boolean(mod && typeof mod.speak === 'function');
}

/**
 * Requests microphone recording permissions
 */
export async function requestMicrophonePermission() {
  const mod = getExpoAudio();
  if (mod && mod.AudioModule && typeof mod.AudioModule.requestRecordingPermissionsAsync === 'function') {
    try {
      const res = await mod.AudioModule.requestRecordingPermissionsAsync();
      return Boolean(res && res.granted);
    } catch (err) {
      console.warn('[NativeAudioBridge] Error requesting mic permission:', err);
    }
  }
  return false;
}

/**
 * Prepares audio mode for recording (enables mic, plays in silent mode)
 */
export async function configureAudioRecordingMode() {
  const mod = getExpoAudio();
  if (mod && typeof mod.setAudioModeAsync === 'function') {
    try {
      await mod.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    } catch (err) {
      console.warn('[NativeAudioBridge] configureAudioRecordingMode warning:', err);
    }
  }
}

/**
 * Prepares audio mode for loud speaker playback
 */
export async function configureAudioPlaybackMode() {
  const mod = getExpoAudio();
  if (mod && typeof mod.setAudioModeAsync === 'function') {
    try {
      await mod.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    } catch (err) {
      console.warn('[NativeAudioBridge] configureAudioPlaybackMode warning:', err);
    }
  }
}

/**
 * Stops any active audio playback (both expo-audio player and expo-speech)
 */
export function stopAudioPlayback() {
  if (activePlaybackTimer) {
    clearTimeout(activePlaybackTimer);
    activePlaybackTimer = null;
  }

  // 1. Stop native expo-audio player
  if (activeAudioPlayer) {
    try {
      if (typeof activeAudioPlayer.pause === 'function') {
        activeAudioPlayer.pause();
      }
      if (typeof activeAudioPlayer.remove === 'function') {
        activeAudioPlayer.remove();
      }
    } catch (_) {}
    activeAudioPlayer = null;
  }

  // 2. Stop expo-speech
  stopSpeechSafe();
}

/**
 * Plays base64-encoded MP3 audio from the backend using expo-audio.
 * Falls back to expo-speech if audioBase64 is empty or playback fails.
 *
 * @param {string} audioBase64 - Base64 MP3 from Edge TTS backend
 * @param {string} fallbackText - Clean answer text for speech fallback
 * @param {object} options - { language: string, onDone: () => void, onError: (err) => void }
 */
export async function playAudioResponse(audioBase64, fallbackText, options = {}) {
  // Always stop previous playback before starting new
  stopAudioPlayback();

  const onDone = options.onDone || (() => {});
  const onError = options.onError || (() => {});

  // If no base64 audio returned, immediately use TTS speech fallback
  if (!audioBase64 || typeof audioBase64 !== 'string' || audioBase64.length < 100) {
    console.log('[NativeAudioBridge] No audioBase64 provided. Using on-device speech fallback.');
    const spoke = speakSafe(fallbackText, {
      language: options.language,
      onDone,
      onError: onDone,
    });
    if (!spoke) onDone();
    return;
  }

  try {
    const FileSystem = require('expo-file-system');
    if (!FileSystem || !FileSystem.cacheDirectory) {
      throw new Error('FileSystem cache directory unavailable');
    }

    // 1. Write base64 audio to temporary cache file
    const fileUri = `${FileSystem.cacheDirectory}hc_voice_answer_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
      encoding: FileSystem.EncodingType?.Base64 || 'base64',
    });

    // 2. Configure audio mode to speaker
    await configureAudioPlaybackMode();

    const expoAudioMod = getExpoAudio();
    if (!expoAudioMod) {
      throw new Error('expo-audio module not available');
    }

    // 3. Play using expo-audio player
    if (typeof expoAudioMod.createAudioPlayer === 'function') {
      const player = expoAudioMod.createAudioPlayer(fileUri);
      activeAudioPlayer = player;

      // Estimate approximate duration from base64 length (~3KB per sec of 24kbps MP3)
      const approxDurationSec = Math.max(3, Math.min(30, Math.round(audioBase64.length / 4000)));

      // Listen for playback completion
      if (player.addListener && typeof player.addListener === 'function') {
        const sub = player.addListener('playbackStatusUpdate', (status) => {
          if (status && (status.didJustFinish || status.isLoaded === false)) {
            stopAudioPlayback();
            onDone();
          }
        });
      }

      // Safety timeout timer in case listener doesn't fire
      activePlaybackTimer = setTimeout(() => {
        stopAudioPlayback();
        onDone();
      }, (approxDurationSec + 1) * 1000);

      player.play();
      console.log(`[NativeAudioBridge] Playing audio response via expo-audio player (~${approxDurationSec}s)...`);
      return;
    }

    throw new Error('createAudioPlayer function unavailable');
  } catch (playErr) {
    console.warn(`[NativeAudioBridge] Audio playback notice (${playErr?.message}). Falling back to expo-speech.`);
    const spoke = speakSafe(fallbackText, {
      language: options.language,
      onDone,
      onError: onDone,
    });
    if (!spoke) onDone();
  }
}

/**
 * Plays text using on-device expo-speech
 */
export function speakSafe(text, options = {}) {
  const speech = getExpoSpeech();
  if (speech && typeof speech.speak === 'function') {
    try {
      const clean = (text || '')
        .replace(/[*_#`~\[\](){}<>|\\]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[•–—]/g, ' ')
        .trim();

      speech.speak(clean, {
        language: options.language || 'en-IN',
        pitch: 1.0,
        rate: 0.95,
        onDone: options.onDone,
        onError: options.onError,
      });
      return true;
    } catch (err) {
      console.warn('[NativeAudioBridge] Speech error:', err?.message);
    }
  }
  return false;
}

export function stopSpeechSafe() {
  const speech = getExpoSpeech();
  if (speech && typeof speech.stop === 'function') {
    try {
      speech.stop();
    } catch (_) {}
  }
}

export default {
  getExpoAudio,
  getExpoSpeech,
  isRecordingSupported,
  isSpeechSupported,
  requestMicrophonePermission,
  configureAudioRecordingMode,
  configureAudioPlaybackMode,
  playAudioResponse,
  stopAudioPlayback,
  speakSafe,
  stopSpeechSafe,
};
