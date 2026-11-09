import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, shadows } from '../constants/layout';
import { useAuth } from '../context/AuthContext';
import {
  sendVoiceTurn,
  sendTextTurn,
  requestHumanCallback,
  checkBackendHealth,
  synthesizeSpeech,
} from '../services/voiceSupportService';
import {
  playAudioResponse,
  stopAudioPlayback,
  isRecordingSupported,
  requestMicrophonePermission,
  configureAudioRecordingMode,
  getExpoAudio,
  speakSafe,
} from '../services/nativeAudioBridge';

const SUPPORTED_LANGUAGES = [
  { code: 'kn-IN', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { code: 'hi-IN', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'en-IN', label: 'English', sub: 'Indian English' },
];

/**
 * Generates a warm, time-of-day greeting personalized with the beekeeper's name
 */
function getTimeBasedGreeting(name, language = 'kn-IN') {
  const hour = new Date().getHours();
  const userName = name && name.trim() && name !== 'Beekeeper' ? name.trim() : '';

  if (language.startsWith('kn')) {
    const timeWord = hour < 12 ? 'ಶುಭೋದಯ' : hour < 17 ? 'ಶುಭ ಮಧ್ಯಾಹ್ನ' : 'ಶುಭ ಸಂಜೆ';
    const namePart = userName ? `${userName} ಅವರೇ` : 'ಜೇನುಸಾಕಣೆದಾರರೇ';
    return `${timeWord} ${namePart}, ಹೇಗಿದ್ದೀರಿ? ಇಂದು ನಿಮ್ಮ ಜೇನು ಕೃಷಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`;
  }

  if (language.startsWith('hi')) {
    const timeWord = hour < 12 ? 'शुभ प्रभात' : hour < 17 ? 'शुभ दोपहर' : 'शुभ संध्या';
    const namePart = userName ? `${userName} जी` : 'किसान भाई';
    return `${timeWord} ${namePart}, आप कैसे हैं? आज आपकी मधुमक्खीशाला के लिए मैं क्या मदद कर सकता हूँ?`;
  }

  // English (en-IN)
  const timeWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const namePart = userName ? `${userName}` : 'there';
  return `${timeWord} ${namePart}, how are you today? How can I help you with your apiary?`;
}

export function TalkToHoneyChain({ visible, onClose }) {
  const { currentUser, user } = useAuth();
  const beekeeperName = currentUser?.name || user?.displayName || '';

  const [selectedLanguage, setSelectedLanguage] = useState('kn-IN');
  // States: 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error'
  const [assistantState, setAssistantState] = useState('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Time-based personalized greeting
  const [greetingText, setGreetingText] = useState('');
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);

  // Turn data
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMockActive, setIsMockActive] = useState(false);
  const [needsHumanSupport, setNeedsHumanSupport] = useState(false);
  const [isCallbackSaved, setIsCallbackSaved] = useState(false);
  const [isSubmittingCallback, setIsSubmittingCallback] = useState(false);

  // Text query mode
  const [textInput, setTextInput] = useState('');
  const [canRecord, setCanRecord] = useState(false);

  // Audio references
  const recorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordStartTimeRef = useRef(0);
  const greetingPlayedRef = useRef(false);

  useEffect(() => {
    setCanRecord(isRecordingSupported());
    return () => {
      cleanupAudio();
    };
  }, []);

  /**
   * Speaks the personalized greeting aloud via Edge TTS or on-device fallback
   */
  const playGreetingAudio = useCallback(async (greeting, lang) => {
    if (!greeting) return;
    setIsPlayingGreeting(true);

    try {
      // 1. Try fetching high-quality neural Edge TTS audio from backend
      const ttsRes = await synthesizeSpeech(greeting, lang);
      if (ttsRes && ttsRes.audioBase64) {
        await playAudioResponse(ttsRes.audioBase64, greeting, {
          language: lang,
          onDone: () => setIsPlayingGreeting(false),
          onError: () => setIsPlayingGreeting(false),
        });
        return;
      }
    } catch (_) {}

    // 2. Fallback to on-device speech
    const spoke = speakSafe(greeting, {
      language: lang,
      onDone: () => setIsPlayingGreeting(false),
      onError: () => setIsPlayingGreeting(false),
    });
    if (!spoke) setIsPlayingGreeting(false);
  }, []);

  // When modal becomes visible: set greeting, play greeting voice, and verify server
  useEffect(() => {
    if (visible) {
      const initialGreeting = getTimeBasedGreeting(beekeeperName, selectedLanguage);
      setGreetingText(initialGreeting);
      setTranscript('');
      setAnswer('');
      setErrorMessage('');

      // Play greeting speech after brief delay so modal animation finishes
      const timer = setTimeout(() => {
        playGreetingAudio(initialGreeting, selectedLanguage);
      }, 350);

      // Verify backend reachability
      checkBackendHealth(2500).then((res) => {
        if (!res.isHealthy) {
          setErrorMessage('Server not reachable. Please make sure the HoneyChain backend is running.');
        }
      });

      return () => clearTimeout(timer);
    } else {
      cleanupAudio();
    }
  }, [visible, beekeeperName, selectedLanguage, playGreetingAudio]);

  const cleanupAudio = async () => {
    clearInterval(recordTimerRef.current);
    if (recorderRef.current) {
      try {
        if (typeof recorderRef.current.stop === 'function') {
          await recorderRef.current.stop();
        }
      } catch (_) {}
      recorderRef.current = null;
    }
    stopAudioPlayback();
    setIsPlayingGreeting(false);
  };

  /**
   * BARGE-IN HANDLER: Stops any currently active speech playback
   */
  const stopPlayback = () => {
    stopAudioPlayback();
    setIsPlayingGreeting(false);
    if (assistantState === 'speaking') {
      setAssistantState('idle');
    }
  };

  /**
   * Switches language, updates greeting and speaks it in the new language
   */
  const handleSelectLanguage = (langCode) => {
    stopPlayback();
    setSelectedLanguage(langCode);
    const newGreeting = getTimeBasedGreeting(beekeeperName, langCode);
    setGreetingText(newGreeting);
    playGreetingAudio(newGreeting, langCode);
  };

  /**
   * PUSH-TO-TALK: Press and Hold to record
   */
  const handlePressIn = async () => {
    stopPlayback();
    setErrorMessage('');
    setIsCallbackSaved(false);

    try {
      const expoAudio = getExpoAudio();
      if (!expoAudio) {
        setErrorMessage('Native audio recording requires a development build. You can also type your question below.');
        return;
      }

      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setErrorMessage('Microphone permission is required to record audio.');
        Alert.alert(
          'Microphone Permission Required',
          'HoneyChain needs access to your microphone so you can speak your questions. Please allow microphone access in device settings.'
        );
        return;
      }

      await configureAudioRecordingMode();

      // Initialize recorder using expo-audio
      if (expoAudio.AudioModule?.AudioRecorder) {
        const recorder = new expoAudio.AudioModule.AudioRecorder(
          expoAudio.RecordingPresets?.HIGH_QUALITY || {}
        );
        await recorder.prepareToRecordAsync();
        recorder.record();
        recorderRef.current = recorder;
      } else {
        throw new Error('Audio recorder module unavailable in this build.');
      }

      recordStartTimeRef.current = Date.now();
      setAssistantState('recording');
      setRecordSeconds(0);

      clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('[Voice Assistant] Record start notice:', err?.message);
      setErrorMessage(
        'Could not initialize microphone recording. Running in Expo Go requires a dev build. You can also type your question.'
      );
      setAssistantState('idle');
    }
  };

  /**
   * PUSH-TO-TALK: Release to stop and process
   */
  const handlePressOut = async () => {
    clearInterval(recordTimerRef.current);

    if (!recorderRef.current || assistantState !== 'recording') {
      return;
    }

    const durationMs = Date.now() - recordStartTimeRef.current;
    if (durationMs < 450) {
      try {
        await recorderRef.current.stop();
      } catch (_) {}
      recorderRef.current = null;
      setAssistantState('idle');
      setErrorMessage('Hold the microphone button down while speaking, then release.');
      return;
    }

    setAssistantState('transcribing');

    try {
      const recorder = recorderRef.current;
      await recorder.stop();
      const uri = recorder.uri;
      recorderRef.current = null;

      if (!uri) {
        throw new Error('Recorded audio file URI unavailable.');
      }

      setAssistantState('thinking');
      const response = await sendVoiceTurn(uri, selectedLanguage);
      handleResponse(response);
    } catch (err) {
      console.warn('[Voice Assistant] Processing error:', err?.message);
      setErrorMessage(err?.message || 'Error communicating with HoneyChain AI backend.');
      setAssistantState('error');
    }
  };

  /**
   * Sends text question to backend
   */
  const handleSendText = async (customText) => {
    const query = (customText || textInput).trim();
    if (!query) return;

    stopPlayback();
    setErrorMessage('');
    setIsCallbackSaved(false);
    setAssistantState('thinking');
    setTextInput('');

    try {
      const response = await sendTextTurn(query, selectedLanguage);
      handleResponse(response);
    } catch (err) {
      console.warn('[Voice Assistant] Text query error:', err?.message);
      setErrorMessage(err?.message || 'Server not reachable. Please make sure the HoneyChain backend is running.');
      setAssistantState('error');
    }
  };

  /**
   * Handles backend response and plays audio MP3
   */
  const handleResponse = (response) => {
    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to process request.');
    }

    setTranscript(response.transcript || response.answerText);
    setAnswer(response.answerText);
    setCitations(response.citations || []);
    setNeedsHumanSupport(Boolean(response.needsHumanSupport));
    setIsMockActive(Boolean(response.isMock));
    setAssistantState('speaking');

    // Playback response via Edge TTS audioBase64 MP3 (with expo-speech fallback)
    playAudioResponse(response.audioBase64, response.answerText, {
      language: response.language || selectedLanguage,
      onDone: () => setAssistantState('idle'),
      onError: () => setAssistantState('idle'),
    });
  };

  /**
   * Requests a Human Support Callback
   */
  const handleRequestCallback = async () => {
    setIsSubmittingCallback(true);
    try {
      await requestHumanCallback({
        transcript: transcript || answer,
        preferredLanguage: selectedLanguage,
        reason: needsHumanSupport
          ? 'AI flagged question for specialist escalation'
          : 'Beekeeper requested human assistance',
        displayName: beekeeperName || 'Beekeeper',
        phoneNumber: currentUser?.phoneNumber || '',
      });
      setIsCallbackSaved(true);
      Alert.alert(
        'Support Request Recorded',
        'A HoneyChain apicultural officer has received your query and will contact you via phone.'
      );
    } catch (err) {
      Alert.alert('Callback Request', err?.message || 'Failed to submit callback request.');
    } finally {
      setIsSubmittingCallback(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              cleanupAudio();
              onClose();
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Talk to HoneyChain</Text>
            <Text style={styles.headerSubtitle}>AI Voice Assistant for Beekeepers</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Language Selector */}
        <View style={styles.languageBar}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langChip, isSelected && styles.langChipActive]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={[styles.langLabel, isSelected && styles.langLabelActive]}>
                  {lang.label}
                </Text>
                <Text style={[styles.langSub, isSelected && styles.langSubActive]}>
                  {lang.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Conversation Area */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Status Indicator */}
          <View style={styles.statusCard}>
            {isPlayingGreeting && (
              <View style={styles.statusRow}>
                <Ionicons name="volume-high" size={24} color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.primary, fontWeight: '600', flex: 1 }]}>
                  {selectedLanguage.startsWith('kn')
                    ? 'ಶುಭಾಶಯ ನುಡಿಯುತ್ತಿದೆ...'
                    : selectedLanguage.startsWith('hi')
                    ? 'स्वागत संदेश बोल रहा है...'
                    : 'Speaking greeting...'}
                </Text>
                <TouchableOpacity onPress={stopPlayback} style={styles.stopButton}>
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isPlayingGreeting && assistantState === 'idle' && (
              <View style={styles.statusRow}>
                <Ionicons name="mic-circle" size={26} color={colors.primary} />
                <Text style={styles.statusText}>
                  {canRecord
                    ? 'Hold the microphone to speak, or type your question below'
                    : 'Type below to ask HoneyChain AI about your hives'}
                </Text>
              </View>
            )}

            {assistantState === 'recording' && (
              <View style={styles.statusRow}>
                <View style={styles.pulseDot} />
                <Text style={[styles.statusText, { color: colors.error, fontWeight: '700' }]}>
                  Listening ({recordSeconds}s)... Release when finished speaking
                </Text>
              </View>
            )}

            {assistantState === 'transcribing' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusText}>Transcribing speech with Whisper...</Text>
              </View>
            )}

            {assistantState === 'thinking' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.statusText}>Consulting apiary knowledge & generating voice answer...</Text>
              </View>
            )}

            {assistantState === 'speaking' && (
              <View style={styles.statusRow}>
                <Ionicons name="volume-high" size={24} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success, fontWeight: '600', flex: 1 }]}>
                  Speaking answer...
                </Text>
                <TouchableOpacity onPress={stopPlayback} style={styles.stopButton}>
                  <Text style={styles.stopButtonText}>Stop Audio</Text>
                </TouchableOpacity>
              </View>
            )}

            {assistantState === 'error' && (
              <View style={styles.statusRow}>
                <Ionicons name="alert-circle" size={24} color={colors.error} />
                <Text style={[styles.statusText, { color: colors.error, flex: 1 }]}>
                  {errorMessage || 'An error occurred.'}
                </Text>
              </View>
            )}
          </View>

          {/* 3. Transcript / Question */}
          {Boolean(transcript) && (
            <View style={styles.turnCard}>
              <View style={styles.turnHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.turnRole}>You Asked</Text>
              </View>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          )}

          {/* 4. AI Grounded Answer */}
          {Boolean(answer) && (
            <View style={styles.answerCard}>
              <View style={styles.turnHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.turnRoleHoneyChain}>HoneyChain Answer</Text>
                {isMockActive && (
                  <View style={styles.mockBadge}>
                    <Text style={styles.mockBadgeText}>MOCK MODE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.answerText}>{answer}</Text>

              {/* Citations */}
              {citations && citations.length > 0 && (
                <View style={styles.citationsBox}>
                  <Text style={styles.citationsTitle}>Sources & References:</Text>
                  {citations.map((cite, index) => (
                    <Text key={index} style={styles.citationItem}>
                      • {cite}
                    </Text>
                  ))}
                </View>
              )}

              {/* Human Escalation Option */}
              <View style={styles.humanSupportBox}>
                <Text style={styles.humanSupportNotice}>
                  {needsHumanSupport
                    ? '⚠️ This query was marked for specialist attention. Would you like a field officer to call you back?'
                    : 'Need human assistance with this hive?'}
                </Text>
                <TouchableOpacity
                  style={[styles.callbackButton, isCallbackSaved && styles.callbackButtonSuccess]}
                  onPress={handleRequestCallback}
                  disabled={isSubmittingCallback || isCallbackSaved}
                >
                  {isSubmittingCallback ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={isCallbackSaved ? 'checkmark-circle' : 'call-outline'}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.callbackButtonText}>
                        {isCallbackSaved ? 'Callback Requested' : 'Request Human Callback'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Control Bar */}
        <View style={styles.bottomBar}>
          {/* Text Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={
                selectedLanguage.startsWith('kn')
                  ? 'ಇಲ್ಲಿ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...'
                  : selectedLanguage.startsWith('hi')
                  ? 'यहाँ सवाल टाइप करें...'
                  : 'Or type a question...'
              }
              placeholderTextColor={colors.textSecondary}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={() => handleSendText()}
            />
            {Boolean(textInput.trim()) && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => handleSendText()}
                disabled={assistantState === 'thinking' || assistantState === 'transcribing'}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Push-to-Talk Mic Button */}
          {canRecord && (
            <View style={styles.micWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={assistantState === 'thinking' || assistantState === 'transcribing'}
                style={[
                  styles.micButton,
                  assistantState === 'recording' && styles.micButtonRecording,
                  (assistantState === 'thinking' || assistantState === 'transcribing') && styles.micButtonDisabled,
                ]}
              >
                <Ionicons
                  name={assistantState === 'recording' ? 'radio' : 'mic'}
                  size={36}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.micHint}>
                {assistantState === 'recording'
                  ? 'Release to Send'
                  : assistantState === 'transcribing'
                  ? 'Transcribing...'
                  : assistantState === 'thinking'
                  ? 'Thinking...'
                  : assistantState === 'speaking'
                  ? 'Tap to Interrupt'
                  : 'Hold to Speak'}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    padding: 6,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  languageBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  langChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  langLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  langLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  langSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  langSubActive: {
    color: colors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  // Status Card
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  stopButton: {
    backgroundColor: colors.error + '18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  stopButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  turnCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.textSecondary,
    ...shadows.sm,
  },
  turnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  turnRole: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  transcriptText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.md,
  },
  turnRoleHoneyChain: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  mockBadge: {
    backgroundColor: colors.warning + '25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  mockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
  },
  answerText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  citationsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  citationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  citationItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  humanSupportBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  humanSupportNotice: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  callbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  callbackButtonSuccess: {
    backgroundColor: colors.success,
  },
  callbackButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  micWrap: {
    alignItems: 'center',
    gap: 4,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  micButtonRecording: {
    backgroundColor: colors.error,
    transform: [{ scale: 1.08 }],
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  micHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default TalkToHoneyChain;
