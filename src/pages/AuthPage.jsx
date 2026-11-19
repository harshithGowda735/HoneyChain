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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import AppButton from '../components/common/AppButton';
import FirebaseRecaptchaModal from '../components/auth/FirebaseRecaptchaModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import { FriendlyBee } from '../components/illustrations/FriendlyBee';
import { HoneycombPattern } from '../components/illustrations/HoneycombPattern';

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
      } else {
        setErrorMessage(err?.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const rawOtp = otpCode.trim();
    if (rawOtp.length !== 6) {
      setErrorMessage(t('invalidOtp', 'Please enter a 6-digit OTP code.'));
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await verifyOtp(rawOtp, sessionInfo);
      // Navigation handles routing automatically on user state change
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('invalid-verification-code') || code.includes('INVALID_CODE')) {
        setErrorMessage(t('invalidOtp', 'Invalid OTP code. Please enter the correct code.'));
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
        {/* Subtle decorative honeycomb header backdrop */}
        <View style={styles.topPatternWrapper} pointerEvents="none">
          <HoneycombPattern width={220} height={120} opacity={0.35} />
        </View>

        {/* 1. First-Time Pre-Auth Language Selection Screen */}
        {step === 'language' ? (
          <View style={styles.languageWrapper}>
            <View style={styles.brandHero}>
              <FriendlyBee size={64} showFlightPath={true} />
              <Text style={styles.appName}>HoneyChain</Text>
              <Text style={styles.tagline}>Smart Beekeeping • Trusted Honey</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeading}>Select Language / ಭಾಷೆ / भाषा</Text>
              <Text style={styles.cardSub}>Choose your preferred language for the application.</Text>

              <View style={styles.langList}>
                {LANGUAGES.map((langItem) => {
                  const isSelected = selectedLang === langItem.code;
                  return (
                    <TouchableOpacity
                      key={langItem.code}
                      activeOpacity={0.75}
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
                          color={isSelected ? colors.primaryDark : colors.textMuted}
                        />
                        <View style={{ marginLeft: spacing.sm }}>
                          <Text style={[styles.langNativeName, isSelected && styles.langTextSelected]}>
                            {langItem.nativeName}
                          </Text>
                          <Text style={styles.langLabel}>{langItem.label}</Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
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
            {/* Friendly Bee Brand Hero */}
            <View style={styles.brandHero}>
              <FriendlyBee size={68} showFlightPath={true} />
              <Text style={styles.appName}>HoneyChain</Text>
              <Text style={styles.tagline}>Smart Beekeeping • Trusted Honey</Text>
            </View>

            {/* Auth Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>
                {step === 'phone' ? 'Beekeeper Login' : 'Enter OTP Verification'}
              </Text>
              <Text style={styles.cardSub}>
                {step === 'phone'
                  ? 'Sign in to access your apiary colonies and harvest records.'
                  : `OTP code sent via SMS to ${pendingPhone || `+91 ${phoneNumber}`}`}
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

                  {/* Public Honey Verification (Clear, Professional Label) */}
                  <View style={styles.consumerDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('publicVerificationTitle', 'PUBLIC HONEY VERIFICATION')}</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.consumerScanBtn}
                    activeOpacity={0.8}
                    onPress={onOpenPublicScanner}
                  >
                    <View style={styles.scanIconWrap}>
                      <Ionicons name="qr-code-outline" size={22} color={colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.consumerScanTitle}>
                        Scan Honey Jar QR
                      </Text>
                      <Text style={styles.consumerScanSub}>
                        Verify authentic purity & origin without signing in
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              ) : (
                /* OTP Verification Step */
                <>
                  {/* Demo OTP Box */}
                  <TouchableOpacity
                    style={styles.demoOtpCard}
                    activeOpacity={0.85}
                    onPress={() => setOtpCode(demoOtpCode)}
                  >
                    <View style={styles.demoOtpContent}>
                      <View style={styles.demoOtpBadge}>
                        <Ionicons name="key" size={13} color={colors.primaryDark} />
                        <Text style={styles.demoOtpBadgeText}>DEMO OTP</Text>
                      </View>
                      <Text style={styles.demoOtpCodeText}>{demoOtpCode}</Text>
                    </View>
                    <View style={styles.demoOtpFillPill}>
                      <Text style={styles.demoOtpFillText}>Tap to fill</Text>
                      <Ionicons name="arrow-down" size={12} color={colors.primaryDark} />
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
                      <Text style={styles.changePhoneLink}>{t('changePhone', 'Change Number')}</Text>
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
          onSuccess={(token) => {
            setRecaptchaVisible(false);
            handleSendOtp(token);
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    position: 'relative',
  },
  topPatternWrapper: {
    position: 'absolute',
    top: 10,
    right: 0,
    opacity: 0.5,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  appName: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.weight.medium,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  langCardSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.backgroundSecondary,
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langNativeName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  langLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  langTextSelected: {
    color: colors.primaryDark,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  countryCodeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceBorder,
    backgroundColor: colors.backgroundSecondary,
  },
  countryCodeText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  continueBtn: {
    width: '100%',
    marginBottom: spacing.md,
  },
  consumerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  consumerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.softAmber,
    backgroundColor: colors.accentSoft,
    gap: spacing.md,
  },
  scanIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  consumerScanTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  consumerScanSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  demoOtpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.softAmber,
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
    gap: 4,
  },
  demoOtpBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  demoOtpCodeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  demoOtpFillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  demoOtpFillText: {
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.primaryDark,
  },
  otpInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.xl,
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.textPrimary,
    fontWeight: typography.weight.bold,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cooldownText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  resendLink: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  changePhoneLink: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  errorAlert: {
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
});

export default AuthPage;
