import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import config from '../constants/config';

export function AuthPage({ onOpenPublicScanner }) {
  const { signIn, signUp } = useAuth();
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [apiaryName, setApiaryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getFriendlyAuthError = (error) => {
    if (!error) return '';
    const code = error.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a moment and try again.';
      default:
        return error.message || 'An authentication error occurred. Please try again.';
    }
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (authMode === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (authMode === 'signin') {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(trimmedEmail, password, {
          displayName: displayName.trim() || undefined,
          apiaryName: apiaryName.trim() || undefined,
        });
      }
    } catch (err) {
      setErrorMessage(getFriendlyAuthError(err));
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
        {/* App Logo & Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{config.appName}</Text>
          <Text style={styles.tagline}>{config.tagline}</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Mode Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setAuthMode('signin');
                setErrorMessage('');
              }}
              style={[styles.tab, authMode === 'signin' && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  authMode === 'signin' && styles.tabTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setAuthMode('signup');
                setErrorMessage('');
              }}
              style={[styles.tab, authMode === 'signup' && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  authMode === 'signup' && styles.tabTextActive,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

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

          {/* Input Fields */}
          {authMode === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Beekeeper Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={colors.textMuted}
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apiary Facility Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="home-outline"
                    size={18}
                    color={colors.textMuted}
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Clover Valley Yard"
                    placeholderTextColor={colors.textMuted}
                    value={apiaryName}
                    onChangeText={setApiaryName}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textMuted}
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="beekeeper@apiary.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textMuted}
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder={
                  authMode === 'signup'
                    ? 'Minimum 6 characters'
                    : 'Your password'
                }
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Submit Button */}
          <AppButton
            title={
              isSubmitting
                ? authMode === 'signin'
                  ? 'Signing In...'
                  : 'Creating Account...'
                : authMode === 'signin'
                ? 'Sign In'
                : 'Create Account'
            }
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting || !email || !password}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
        </View>

        {/* Public Consumer Verification Shortcut */}
        {onOpenPublicScanner && (
          <View style={styles.consumerVerifyBox}>
            <View style={styles.consumerVerifyHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={styles.consumerVerifyTitle}>Consumer Honey Traceability</Text>
            </View>
            <Text style={styles.consumerVerifyText}>
              Scan a honey jar label or enter a batch code to verify floral variety, extraction date, and harvest authenticity without an account.
            </Text>
            <AppButton
              title="Verify Honey Jar (Scan / Enter Code)"
              iconName="qr-code-outline"
              variant="outline"
              size="sm"
              onPress={onOpenPublicScanner}
              style={styles.consumerVerifyBtn}
            />
          </View>
        )}

        {/* Security Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Secured with Firebase Authentication & Cloud Firestore
          </Text>
        </View>
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
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  appName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    ...shadows.elevated,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  tabText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderColor: colors.status.critical.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  consumerVerifyBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
  },
  consumerVerifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  consumerVerifyTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  consumerVerifyText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  consumerVerifyBtn: {
    alignSelf: 'stretch',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});

export default AuthPage;
