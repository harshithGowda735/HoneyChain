import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import AppButton from '../components/common/AppButton';
import LanguageSelector from '../components/common/LanguageSelector';
import FirebaseRecaptchaModal from '../components/auth/FirebaseRecaptchaModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function AuthPage({ onOpenPublicScanner }) {
  const { sendOtp, verifyOtp } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Auth Step: 'phone' -> 'otp'
  const [step, setStep] = useState('phone');

  // Input states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [apiaryName, setApiaryName] = useState('');

  // OTP flow state
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Recaptcha challenge modal
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (cooldownSeconds > 0) {
      timer = setTimeout(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const cleanPhoneDigits = (text) => {
    return text.replace(/[^0-9]/g, '').slice(0, 10);
  };

  const handleSendOtp = async (recaptchaToken = '') => {
    const rawDigits = cleanPhoneDigits(phoneNumber);
    if (rawDigits.length !== 10) {
      setErrorMessage(t('invalidPhone'));
      return;
    }

    const fullPhone = `+91${rawDigits}`;
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await sendOtp(fullPhone, recaptchaToken);
      setSessionInfo(result.sessionInfo);
      setPendingPhone(fullPhone);
      setStep('otp');
      setCooldownSeconds(60);
      setOtpCode('');
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('captcha') || code.includes('TOO_MANY_ATTEMPTS')) {
        // Trigger webview recaptcha challenge modal
        setRecaptchaVisible(true);
      } else if (code.includes('invalid-phone') || code.includes('INVALID_PHONE_NUMBER')) {
        setErrorMessage(t('invalidPhone'));
      } else if (code.includes('quota') || code.includes('QUOTA_EXCEEDED')) {
        setErrorMessage('SMS limit exceeded. Please try again later or use official test credentials.');
      } else {
        setErrorMessage(err?.message || 'Failed to send OTP. Please check your network and number.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecaptchaSuccess = async (token) => {
    setRecaptchaVisible(false);
    await handleSendOtp(token);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage(t('invalidOtp'));
      return;
    }

    if (!sessionInfo) {
      setErrorMessage('Verification session expired. Please request a new OTP.');
      setStep('phone');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await verifyOtp(sessionInfo, otpCode.trim(), {
        phoneNumber: pendingPhone,
        displayName: displayName.trim() || undefined,
        apiaryName: apiaryName.trim() || undefined,
        preferredLanguage: language,
      });
      // Auth success is captured by onAuthStateChanged in AuthContext
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('invalid') || code.includes('INVALID_CODE')) {
        setErrorMessage(t('invalidOtp'));
      } else if (code.includes('expired') || code.includes('SESSION_EXPIRED')) {
        setErrorMessage('OTP expired. Please request a new code.');
      } else {
        setErrorMessage(err?.message || 'Failed to verify OTP. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Government Language Selection Header (Pre-Auth) */}
        <View style={styles.topLanguageSection}>
          <Text style={styles.chooseLanguageTitle}>{t('selectLanguage')}</Text>
          <LanguageSelector compact={false} />
        </View>

        {/* Government Agri Identity Header */}
        <View style={styles.header}>
          <View style={styles.emblemBadge}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
          <View style={styles.govTag}>
            <Ionicons name="leaf-outline" size={13} color={colors.primary} />
            <Text style={styles.govTagText}>{t('govInitiativeSub')}</Text>
          </View>
        </View>

        {/* Main Phone Authentication Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === 'phone' ? t('newBeekeeperTitle') : t('enterOtp')}
          </Text>
          <Text style={styles.cardSubtitle}>
            {step === 'phone'
              ? t('newBeekeeperSub')
              : `${t('otpSentTo')} +91 ${cleanPhoneDigits(phoneNumber)}`}
          </Text>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={colors.status.critical.text}
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {step === 'phone' ? (
            <>
              {/* Optional Beekeeper Profile Details for New Accounts */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('nameLabel')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('namePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('apiaryNameLabel')}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="home-outline" size={18} color={colors.textMuted} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('apiaryNamePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={apiaryName}
                    onChangeText={setApiaryName}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Mobile Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('mobileNumber')} *</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={[styles.input, styles.phoneInputText]}
                      placeholder={t('mobileNumberPlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={phoneNumber}
                      onChangeText={(val) => setPhoneNumber(cleanPhoneDigits(val))}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!isSubmitting}
                    />
                  </View>
                </View>
              </View>

              <AppButton
                title={isSubmitting ? t('sendingOtp') : t('sendOtp')}
                iconName="arrow-forward-outline"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting || cleanPhoneDigits(phoneNumber).length !== 10}
                onPress={() => handleSendOtp()}
                style={styles.submitBtn}
              />

              <Text style={styles.disclaimerText}>
                {t('phoneAuthDisclaimer')}
              </Text>
            </>
          ) : (
            <>
              {/* 6-Digit OTP Entry */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('enterOtp')} *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.icon} />
                  <TextInput
                    style={[styles.input, styles.otpInputText]}
                    placeholder={t('otpPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={otpCode}
                    onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <AppButton
                title={isSubmitting ? t('verifyingOtp') : t('verifyAndLogin')}
                iconName="checkmark-circle-outline"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting || otpCode.length !== 6}
                onPress={handleVerifyOtp}
                style={styles.submitBtn}
              />

              {/* OTP Resend & Change Number Actions */}
              <View style={styles.otpActionsRow}>
                {cooldownSeconds > 0 ? (
                  <Text style={styles.cooldownText}>
                    {t('resendCooldown').replace('{s}', String(cooldownSeconds))}
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSendOtp()}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resendLink}>{t('resendOtp')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setOtpCode('');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeNumberLink}>{t('changeNumber')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Public Consumer Honey Verification Box */}
        {onOpenPublicScanner && (
          <View style={styles.consumerVerifyBox}>
            <View style={styles.consumerHeaderRow}>
              <View style={styles.consumerIconCircle}>
                <Ionicons name="qr-code-outline" size={20} color={colors.accentDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.consumerVerifyTitle}>{t('publicConsumerSection')}</Text>
                <Text style={styles.consumerVerifyDesc}>{t('verifyJarDesc')}</Text>
              </View>
            </View>
            <AppButton
              title={t('verifyJarPublic')}
              iconName="camera-outline"
              variant="outline"
              size="md"
              onPress={onOpenPublicScanner}
              style={styles.consumerBtn}
            />
          </View>
        )}

        {/* Official Security Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Secured by Government-Grade Firebase Telemetry & Cloud Firestore
          </Text>
        </View>
      </ScrollView>

      {/* Embedded Recaptcha Modal */}
      <FirebaseRecaptchaModal
        visible={recaptchaVisible}
        onClose={() => setRecaptchaVisible(false)}
        onSuccess={handleRecaptchaSuccess}
        onError={(err) => {
          setRecaptchaVisible(false);
          setErrorMessage(err?.message || 'Security check failed. Please try again.');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  topLanguageSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  chooseLanguageTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emblemBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  appName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  govTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: 4,
  },
  govTagText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.card,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderColor: colors.status.critical.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  countryCodeBox: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  phoneInputText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  otpInputText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    letterSpacing: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: typography.size.sm + 1,
    color: colors.textPrimary,
  },
  submitBtn: {
    width: '100%',
    marginTop: spacing.xs,
  },
  disclaimerText: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cooldownText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  resendLink: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  changeNumberLink: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.accentDeep,
  },
  consumerVerifyBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  consumerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  consumerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumerVerifyTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  consumerVerifyDesc: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  consumerBtn: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  footerText: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default AuthPage;
