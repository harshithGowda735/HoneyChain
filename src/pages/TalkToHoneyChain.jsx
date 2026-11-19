/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
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
import { spacing, borderRadius, shadows, typography } from '../constants/layout';
import { useAuth } from '../context/AuthContext';
import { FriendlyBee } from '../components/illustrations';
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

const SUGGESTED_PROMPTS = {
  'kn-IN': [
    'ಹೈವ್ 1 ನ ತಾಪಮಾನ ಹೇಗಿದೆ?',
    'ಜೇನುತುಪ್ಪ ಕೊಯ್ಲು ಯಾವಾಗ ಮಾಡಬೇಕು?',
    'ಸರ್ಕಾರದ ಸಬ್ಸಿಡಿ ಯೋಜನೆಗಳ ವಿವರ ನೀಡಿ',
  ],
  'hi-IN': [
    'हाइव 1 का तापमान कैसा है?',
    'शहद की कटाई कब करनी चाहिए?',
    'मधुमक्खी पालन की सरकारी योजनाएं बताएं',
  ],
  'en-IN': [
    'How is Hive 1 doing today?',
    'When should I harvest honey?',
    'Check government subsidy schemes',
  ],
};

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

  const cleanupAudio = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    setCanRecord(isRecordingSupported());
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

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
  }, [visible, beekeeperName, selectedLanguage, playGreetingAudio, cleanupAudio]);

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

  const prompts = SUGGESTED_PROMPTS[selectedLanguage] || SUGGESTED_PROMPTS['en-IN'];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with Mascot */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              cleanupAudio();
              onClose();
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerMascotRow}>
              <FriendlyBee size={24} style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>HoneyChain AI</Text>
            </View>
            <Text style={styles.headerSubtitle}>Apicultural Voice Assistant</Text>
          </View>

          <View style={styles.beeHeaderBadge}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primaryDark} />
            <Text style={styles.beeHeaderBadgeText}>Active</Text>
          </View>
        </View>

        {/* Language Selector Bar */}
        <View style={styles.languageBar}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langChip, isSelected && styles.langChipActive]}
                onPress={() => handleSelectLanguage(lang.code)}
                activeOpacity={0.75}
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
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status & Live State Banner */}
          <View style={styles.statusCard}>
            {isPlayingGreeting && (
              <View style={styles.statusRow}>
                <View style={styles.statusIconWrap}>
                  <Ionicons name="volume-high" size={20} color={colors.primaryDark} />
                </View>
                <Text style={[styles.statusText, { color: colors.primaryDark, fontWeight: '700', flex: 1 }]}>
                  {selectedLanguage.startsWith('kn')
                    ? 'ಶುಭಾಶಯ ನುಡಿಯುತ್ತಿದೆ...'
                    : selectedLanguage.startsWith('hi')
                    ? 'स्वागत संदेश बोल रहा है...'
                    : 'Speaking greeting...'}
                </Text>
                <TouchableOpacity onPress={stopPlayback} style={styles.stopButton} activeOpacity={0.7}>
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isPlayingGreeting && assistantState === 'idle' && (
              <View style={styles.statusRow}>
                <View style={styles.statusIconWrap}>
                  <Ionicons name="mic-circle" size={22} color={colors.primaryDark} />
                </View>
                <Text style={styles.statusText}>
                  {canRecord
                    ? 'Hold the microphone to speak, or tap a suggestion below'
                    : 'Type below to ask HoneyChain AI about your apiary'}
                </Text>
              </View>
            )}

            {assistantState === 'recording' && (
              <View style={styles.statusRow}>
                <View style={styles.pulseDot} />
                <Text style={[styles.statusText, { color: colors.deepHoney, fontWeight: '700' }]}>
                  Listening ({recordSeconds}s)... Release when finished speaking
                </Text>
              </View>
            )}

            {assistantState === 'transcribing' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primaryDark} />
                <Text style={styles.statusText}>Transcribing speech with Whisper...</Text>
              </View>
            )}

            {assistantState === 'thinking' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primaryDark} />
                <Text style={styles.statusText}>Consulting apiary knowledge & generating voice answer...</Text>
              </View>
            )}

            {assistantState === 'speaking' && (
              <View style={styles.statusRow}>
                <View style={[styles.statusIconWrap, { backgroundColor: '#EBF4E5' }]}>
                  <Ionicons name="volume-high" size={20} color={colors.sage} />
                </View>
                <Text style={[styles.statusText, { color: colors.sage, fontWeight: '700', flex: 1 }]}>
                  Speaking answer...
                </Text>
                <TouchableOpacity onPress={stopPlayback} style={styles.stopButton} activeOpacity={0.7}>
                  <Text style={styles.stopButtonText}>Stop Audio</Text>
                </TouchableOpacity>
              </View>
            )}

            {assistantState === 'error' && (
              <View style={styles.statusRow}>
                <Ionicons name="alert-circle" size={22} color={colors.status.critical.text} />
                <Text style={[styles.statusText, { color: colors.status.critical.text, flex: 1 }]}>
                  {errorMessage || 'An error occurred.'}
                </Text>
              </View>
            )}
          </View>

          {/* Greeting Card */}
          {Boolean(greetingText) && (
            <View style={styles.greetingBubble}>
              <View style={styles.bubbleHeaderRow}>
                <FriendlyBee size={20} />
                <Text style={styles.assistantBubbleTitle}>HoneyChain Assistant</Text>
              </View>
              <Text style={styles.greetingText}>{greetingText}</Text>
            </View>
          )}

          {/* Quick Suggestions Chips (Visible when not actively conversing) */}
          {!transcript && !answer && assistantState === 'idle' && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggested Inquiries</Text>
              <View style={styles.suggestionsGrid}>
                {prompts.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => handleSendText(p)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryDark} />
                    <Text style={styles.suggestionChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Beekeeper's Transcript / Question Bubble */}
          {Boolean(transcript) && (
            <View style={styles.userBubble}>
              <View style={styles.bubbleHeaderRow}>
                <Ionicons name="person-circle" size={18} color={colors.primaryDark} />
                <Text style={styles.userBubbleTitle}>You Asked</Text>
              </View>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          )}

          {/* AI Grounded Answer Bubble */}
          {Boolean(answer) && (
            <View style={styles.assistantBubble}>
              <View style={styles.bubbleHeaderRow}>
                <FriendlyBee size={22} />
                <Text style={styles.assistantBubbleTitle}>HoneyChain Response</Text>
                {isMockActive && (
                  <View style={styles.mockBadge}>
                    <Text style={styles.mockBadgeText}>OFFLINE MODE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.answerText}>{answer}</Text>

              {/* Citations & Apicultural Guidelines */}
              {citations && citations.length > 0 && (
                <View style={styles.citationsBox}>
                  <View style={styles.citationsHeaderRow}>
                    <Ionicons name="book-outline" size={13} color={colors.sage} />
                    <Text style={styles.citationsTitle}>Apicultural References:</Text>
                  </View>
                  {citations.map((cite, index) => (
                    <Text key={index} style={styles.citationItem}>
                      • {cite}
                    </Text>
                  ))}
                </View>
              )}

              {/* Specialist / Human Escalation Option */}
              <View style={styles.humanSupportBox}>
                <Text style={styles.humanSupportNotice}>
                  {needsHumanSupport
                    ? '⚠️ This query was marked for specialist attention. Would you like an apicultural field officer to call you back?'
                    : 'Need human assistance with your apiary?'}
                </Text>
                <TouchableOpacity
                  style={[styles.callbackButton, isCallbackSaved && styles.callbackButtonSuccess]}
                  onPress={handleRequestCallback}
                  disabled={isSubmittingCallback || isCallbackSaved}
                  activeOpacity={0.8}
                >
                  {isSubmittingCallback ? (
                    <ActivityIndicator size="small" color="#493D32" />
                  ) : (
                    <>
                      <Ionicons
                        name={isCallbackSaved ? 'checkmark-circle' : 'call'}
                        size={16}
                        color={isCallbackSaved ? '#FFFFFF' : '#493D32'}
                      />
                      <Text
                        style={[
                          styles.callbackButtonText,
                          isCallbackSaved && { color: '#FFFFFF' },
                        ]}
                      >
                        {isCallbackSaved ? 'Callback Scheduled' : 'Request Apicultural Support Call'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Push-to-Talk Bar */}
        <View style={styles.bottomBar}>
          {/* Quick Text Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={
                selectedLanguage.startsWith('kn')
                  ? 'ಇಲ್ಲಿ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...'
                  : selectedLanguage.startsWith('hi')
                  ? 'यहाँ सवाल टाइप करें...'
                  : 'Or type your beekeeping question...'
              }
              placeholderTextColor={colors.textMuted}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={() => handleSendText()}
            />
            {Boolean(textInput.trim()) && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => handleSendText()}
                disabled={assistantState === 'thinking' || assistantState === 'transcribing'}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up" size={18} color="#493D32" />
              </TouchableOpacity>
            )}
          </View>

          {/* Push-to-Talk Microphone Button */}
          {canRecord && (
            <View style={styles.micWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
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
                  size={32}
                  color={assistantState === 'recording' ? '#FFFDF7' : '#493D32'}
                />
              </TouchableOpacity>
              <Text style={styles.micHint}>
                {assistantState === 'recording'
                  ? 'Release to Send'
                  : assistantState === 'transcribing'
                  ? 'Transcribing audio...'
                  : assistantState === 'thinking'
                  ? 'Analyzing...'
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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: spacing.sm + 2,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    ...shadows.card,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerMascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.md + 2,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  beeHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  beeHeaderBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  languageBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  langChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  langLabelActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  langSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  langSubActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.card,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  statusText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
    flex: 1,
    lineHeight: 18,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.deepHoney,
  },
  stopButton: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  stopButtonText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  greetingBubble: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.card,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  assistantBubbleTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  suggestionsContainer: {
    marginTop: 4,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  suggestionsGrid: {
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardSurface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  suggestionChipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  userBubble: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
    alignSelf: 'flex-end',
    maxWidth: '92%',
    ...shadows.sm,
  },
  userBubbleTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
    fontWeight: typography.weight.medium,
  },
  assistantBubble: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.card,
  },
  mockBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  mockBadgeText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  answerText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  citationsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  citationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  citationsTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.sage,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderTopColor: colors.surfaceBorder,
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
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  callbackButtonSuccess: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  callbackButtonText: {
    color: '#493D32',
    fontSize: 13,
    fontWeight: typography.weight.bold,
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: colors.cardSurface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    gap: 10,
    ...shadows.card,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
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
    borderWidth: 1,
    borderColor: colors.primaryDark,
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
    borderWidth: 2,
    borderColor: colors.primaryDark,
    ...shadows.lg,
  },
  micButtonRecording: {
    backgroundColor: colors.deepHoney,
    borderColor: colors.primary,
    transform: [{ scale: 1.08 }],
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  micHint: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
});

export default TalkToHoneyChain;
