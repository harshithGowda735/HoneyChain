import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import AppButton from '../components/common/AppButton';
import FirebaseRecaptchaModal from '../components/auth/FirebaseRecaptchaModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

export function AuthPage({ onOpenPublicScanner }) {
  const { sendOtp, verifyOtp } = useAuth();
  const {
    language,
    hasSelectedInitialLanguage,
    completeInitialLanguageSelection,
    t,
  } = useLanguage();

  // Internal flow state: 'language' | 'phone' | 'otp'
  const [step, setStep] = useState(hasSelectedInitialLanguage ? 'phone' : 'language');
  const [selectedLang, setSelectedLang] = useState(language || 'en');

  // Input states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('123456');

  // OTP flow state
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Recaptcha modal
  const [recaptchaVisible, setRecaptchaVisible] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');

  // Sync if language was selected elsewhere
  useEffect(() => {
    if (hasSelectedInitialLanguage && step === 'language') {
      setStep('phone');
    }
  }, [hasSelectedInitialLanguage]);

  // Resend countdown timer
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

  const handleLanguageContinue = async () => {
    await completeInitialLanguageSelection(selectedLang);
    setStep('phone');
  };

  const handleSendOtp = async (recaptchaToken = '') => {
    const rawDigits = cleanPhoneDigits(phoneNumber);
    if (rawDigits.length !== 10) {
      setErrorMessage(t('invalidPhone', 'Please enter a valid 10-digit mobile number.'));
      return;
    }

    const fullPhone = `+91${rawDigits}`;
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await sendOtp(fullPhone, recaptchaToken);
      setSessionInfo(result?.sessionInfo);
      setDemoOtpCode(result?.demoOtp || '123456');
      setPendingPhone(fullPhone);
      setStep('otp');
      setCooldownSeconds(60);
      setOtpCode('');
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('captcha') || code.includes('TOO_MANY_ATTEMPTS')) {
        setRecaptchaVisible(true);
      } else if (code.includes('invalid-phone') || code.includes('INVALID_PHONE_NUMBER')) {
        setErrorMessage(t('invalidPhone', 'Please enter a valid 10-digit mobile number.'));
      } else if (code.includes('quota') || code.includes('QUOTA_EXCEEDED')) {
        setErrorMessage('SMS limit reached. Please try test numbers (+91 9876543210 / 123456).');
      } else {
        setErrorMessage(err?.message || 'Failed to send OTP. Check network and phone number.');
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
      setErrorMessage(t('invalidOtp', 'Please enter the complete 6-digit OTP code.'));
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
        preferredLanguage: language,
      });
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('invalid') || code.includes('INVALID_CODE')) {
        setErrorMessage(t('invalidOtp', 'Please enter the complete 6-digit OTP code.'));
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
        {/* 1. First-Time Pre-Auth Language Selection Screen */}
        {step === 'language' ? (
          <View style={styles.languageWrapper}>
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Ionicons name="nutrition-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.appName}>HoneyChain</Text>
              <Text style={styles.tagline}>Smart Beekeeping. Trusted Honey.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeading}>Select Language</Text>
              <Text style={styles.cardSub}>Choose your preferred language for the app.</Text>

              <View style={styles.langList}>
                {LANGUAGES.map((langItem) => {
                  const isSelected = selectedLang === langItem.code;
                  return (
                    <TouchableOpacity
                      key={langItem.code}
                      activeOpacity={0.7}
                      onPress={() => setSelectedLang(langItem.code)}
                      style={[
                        styles.langCard,
                        isSelected && styles.langCardSelected,
                      ]}
                    >
                      <View style={styles.langCardLeft}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <View style={{ marginLeft: spacing.sm }}>
                          <Text style={[styles.langNativeName, isSelected && styles.langTextSelected]}>
                            {langItem.nativeName}
                          </Text>
                          <Text style={styles.langLabel}>{langItem.label}</Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppButton
                title="Continue"
                variant="primary"
                size="lg"
                onPress={handleLanguageContinue}
                style={styles.continueBtn}
              />
            </View>
          </View>
        ) : (
          /* 2. Phone Login & OTP Screens */
          <View style={styles.authWrapper}>
            {/* Minimal Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Ionicons name="nutrition-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.appName}>HoneyChain</Text>
              <Text style={styles.tagline}>Smart Beekeeping. Trusted Honey.</Text>
            </View>

            {/* Auth Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>
                {step === 'phone' ? 'Welcome' : 'Enter OTP'}
              </Text>
              <Text style={styles.cardSub}>
                {step === 'phone'
                  ? 'Sign in to your apiary.'
                  : `OTP sent to ${pendingPhone || `+91 ${phoneNumber}`}`}
              </Text>

              {/* Error Alert */}
              {errorMessage ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {step === 'phone' ? (
                <>
                  {/* Phone Input Row */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('mobileNumber')}</Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder={t('mobileNumberPlaceholder', '10-digit mobile number')}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phoneNumber}
                        onChangeText={(txt) => setPhoneNumber(cleanPhoneDigits(txt))}
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>

                  {/* Continue Button */}
                  <AppButton
                    title={isSubmitting ? t('sendingOtp') : t('sendOtp')}
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    onPress={() => handleSendOtp('')}
                    style={styles.continueBtn}
                  />

                  {/* Public Consumer QR Verification Shortcut */}
                  <View style={styles.consumerDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>CONSUMER ACCESS</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.consumerScanBtn}
                    activeOpacity={0.7}
                    onPress={onOpenPublicScanner}
                  >
                    <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
                    <Text style={styles.consumerScanText}>
                      Verify Honey Jar (No Login Required)
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* OTP Verification Step */
                <>
                  {/* Demo OTP Box */}
                  <TouchableOpacity
                    style={styles.demoOtpCard}
                    activeOpacity={0.8}
                    onPress={() => setOtpCode(demoOtpCode)}
                  >
                    <View style={styles.demoOtpContent}>
                      <View style={styles.demoOtpBadge}>
                        <Ionicons name="key" size={13} color={colors.accentDeep} />
                        <Text style={styles.demoOtpBadgeText}>DEMO OTP</Text>
                      </View>
                      <Text style={styles.demoOtpCodeText}>{demoOtpCode}</Text>
                    </View>
                    <View style={styles.demoOtpFillPill}>
                      <Text style={styles.demoOtpFillText}>Tap to fill</Text>
                      <Ionicons name="arrow-down" size={12} color={colors.primary} />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('enterOtp')}</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="• • • • • •"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* Resend OTP & Change Phone Actions */}
                  <View style={styles.otpActionsRow}>
                    {cooldownSeconds > 0 ? (
                      <Text style={styles.cooldownText}>
                        Resend code in {cooldownSeconds}s
                      </Text>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSendOtp('')}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.resendLink}>{t('resendOtp')}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setStep('phone');
                        setErrorMessage('');
                      }}
                    >
                      <Text style={styles.changePhoneLink}>{t('changeNumber')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Verify & Sign In Button */}
                  <AppButton
                    title={isSubmitting ? t('verifyingOtp') : t('verifyAndLogin')}
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    onPress={handleVerifyOtp}
                    style={styles.continueBtn}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {/* Security ReCAPTCHA Modal */}
        <FirebaseRecaptchaModal
          visible={recaptchaVisible}
          onClose={() => setRecaptchaVisible(false)}
          onSuccess={handleRecaptchaSuccess}
          onError={(err) => {
            setRecaptchaVisible(false);
            setErrorMessage(err || 'Verification failed. Please retry.');
          }}
        />
      </ScrollView>
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
    paddingVertical: spacing.xxl,
  },
  languageWrapper: {
    width: '100%',
  },
  authWrapper: {
    width: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.weight.medium,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.xl,
    ...shadows.card,
  },
  cardHeading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  langList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceSubtle,
  },
  langCardSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langNativeName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  langTextSelected: {
    color: colors.primary,
  },
  langLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  continueBtn: {
    marginTop: spacing.xs,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  countryCodeBadge: {
    paddingHorizontal: spacing.md,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBorder,
  },
  countryCodeText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  consumerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  dividerText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  consumerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  consumerScanText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  otpInput: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    textAlign: 'center',
    fontSize: typography.size.xxl,
    letterSpacing: 8,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cooldownText: {
    fontSize: typography.size.xs + 1,
    color: colors.textMuted,
  },
  resendLink: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  changePhoneLink: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  demoOtpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  demoOtpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demoOtpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 3,
  },
  demoOtpBadgeText: {
    fontSize: typography.size.xs - 2,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
    letterSpacing: 0.5,
  },
  demoOtpCodeText: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
    letterSpacing: 2,
  },
  demoOtpFillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  demoOtpFillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
});

export default AuthPage;
