/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import AppButton from '../components/common/AppButton';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { pickProfileImage } from '../services/storageService';
import { detectCurrentLocation, INDIAN_STATES as STATES } from '../services/locationService';
import { FriendlyBee, BeehiveIllustration, HoneycombPattern } from '../components/illustrations';

const ENTITY_CATEGORIES = [
  { value: 'farmer', label: 'Individual Farmer', labelKn: 'ವೈಯಕ್ತಿಕ ಕೃಷಿಕ', labelHi: 'व्यक्तिगत किसान' },
  { value: 'fpo_shg', label: 'FPO / SHG Member', labelKn: 'FPO / ಸಂಘದ ಸದಸ್ಯ', labelHi: 'एफपीओ / एसएचजी सदस्य' },
  { value: 'enterprise', label: 'Commercial Beekeeper', labelKn: 'ವಾಣಿಜ್ಯ ಜೇನುಸಾಕಣೆದಾರ', labelHi: 'व्याವಸಾಯಿಕ ಮಧುಮಕ್ಖೀ ಪಾಲಕ' },
];

export function FirstTimeSetupPage({ onComplete }) {
  const { currentUser, updateProfile } = useAuth();
  const { language, t } = useLanguage();

  const [displayName, setDisplayName] = useState(currentUser?.name !== 'Beekeeper' ? currentUser?.name || '' : '');
  const [apiaryName, setApiaryName] = useState(currentUser?.apiaryName !== 'Cauvery Honey Farm' ? currentUser?.apiaryName || '' : '');
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [district, setDistrict] = useState(currentUser?.district || '');
  const [entityType, setEntityType] = useState('farmer');
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photoUrl || null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectedNotice, setLocationDetectedNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDetectLocation = useCallback(async (isAuto = false) => {
    setIsDetectingLocation(true);
    try {
      const detected = await detectCurrentLocation(isAuto);
      if (detected && detected.state) {
        setSelectedState(detected.state);
        if (detected.district && !district) {
          setDistrict(detected.district);
        }
        setLocationDetectedNotice(`${detected.district ? `${detected.district}, ` : ''}${detected.state}`);
        if (!isAuto) {
          Alert.alert(
            'Location Detected',
            `Detected location: ${detected.formatted || detected.state}`
          );
        }
      }
    } catch (_err) {
      if (!isAuto) {
        Alert.alert('Location Notice', 'Could not fetch GPS coordinates. Please select your state manually.');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  }, [district]);

  // Automatically detect beekeeper location upon loading
  useEffect(() => {
    handleDetectLocation(true);
  }, [handleDetectLocation]);

  const handlePickPhoto = async () => {
    setIsPickingPhoto(true);
    try {
      const picked = await pickProfileImage();
      if (picked && picked.persistentUrl) {
        setPhotoUrl(picked.persistentUrl);
      }
    } catch (err) {
      Alert.alert('Profile Photo', err?.message || 'Could not select photo.');
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setErrorMsg(t('nameRequired', 'Please enter your full name.'));
      return;
    }
    if (!apiaryName.trim()) {
      setErrorMsg(t('apiaryRequired', 'Please enter your apiary or farm name.'));
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        apiaryName: apiaryName.trim(),
        state: selectedState,
        district: district.trim(),
        entityType,
        photoUrl: photoUrl || currentUser?.photoUrl || null,
        isProfileComplete: true,
      });

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save profile. Please check network.');
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
        {/* Hero Banner with FriendlyBee & Beehive */}
        <View style={styles.heroCard}>
          <View style={styles.patternOverlay} pointerEvents="none">
            <HoneycombPattern size={110} opacity={0.14} />
          </View>
          <View style={styles.heroArtRow}>
            <FriendlyBee size={52} />
            <BeehiveIllustration size={64} style={{ marginLeft: -12 }} />
          </View>

          <View style={styles.stepBadge}>
            <Ionicons name="sparkles" size={12} color={colors.primaryDark} />
            <Text style={styles.stepBadgeText}>Welcome to HoneyChain • Step 1 of 1</Text>
          </View>

          <Text style={styles.title}>Register Your Apiary</Text>
          <Text style={styles.subtitle}>
            Set up your apiary identity for IoT telemetry, honey traceability, and government scheme verification.
          </Text>
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.status.critical.text} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Main Form Card */}
        <View style={styles.formCard}>
          {/* Beekeeper Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={handlePickPhoto}
              style={styles.photoPickerBtn}
              activeOpacity={0.8}
              disabled={isPickingPhoto}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={26} color={colors.primaryDark} />
                </View>
              )}
              <View style={styles.photoBadge}>
                <Ionicons name="add" size={14} color="#FFFDF7" />
              </View>
            </TouchableOpacity>
            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>Beekeeper Photo</Text>
              <Text style={styles.photoSub}>
                {photoUrl ? 'Tap to change photo' : 'Add photo for honey consumer verification cards'}
              </Text>
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('nameLabel')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={colors.primaryDark} style={styles.inputIcon} />
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

          {/* Apiary / Farm Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('apiaryNameLabel')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="home-outline" size={18} color={colors.primaryDark} style={styles.inputIcon} />
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

          {/* State with Auto-Detect */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('stateLabel')}</Text>
              <TouchableOpacity
                onPress={() => handleDetectLocation(false)}
                style={styles.detectLocationBtn}
                activeOpacity={0.7}
                disabled={isDetectingLocation}
              >
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <>
                    <Ionicons name="locate" size={13} color={colors.primaryDark} />
                    <Text style={styles.detectLocationText}>
                      {locationDetectedNotice ? `📍 ${locationDetectedNotice}` : 'GPS Auto-Detect'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 10 }}>
              {STATES.map((st) => {
                const isSelected = selectedState === st;
                return (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.75}
                    onPress={() => setSelectedState(st)}
                    style={[
                      styles.stateChip,
                      isSelected && styles.stateChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stateChipText,
                        isSelected && styles.stateChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} style={{ marginLeft: 3 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* District / Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('districtLabel')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={18} color={colors.primaryDark} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Kodagu / Mysuru / Shimoga"
                placeholderTextColor={colors.textMuted}
                value={district}
                onChangeText={setDistrict}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Beekeeper Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beekeeper Category</Text>
            <View style={styles.categoryContainer}>
              {ENTITY_CATEGORIES.map((cat) => {
                const isSelected = entityType === cat.value;
                const labelText =
                  language === 'kn'
                    ? cat.labelKn
                    : language === 'hi'
                    ? cat.labelHi
                    : cat.label;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    activeOpacity={0.75}
                    onPress={() => setEntityType(cat.value)}
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={isSelected ? colors.primaryDark : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {labelText}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <AppButton
            title="Complete Setup & Enter Apiary"
            iconName="arrow-forward"
            iconPosition="right"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...shadows.card,
  },
  patternOverlay: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  heroArtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 4,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    lineHeight: 18,
  },
  errorBanner: {
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
    color: colors.status.critical.text,
  },
  formCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    ...shadows.card,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  photoPickerBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  photoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardSurface,
  },
  photoInfo: {
    flex: 1,
  },
  photoTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  photoSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  detectLocationText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  inputGroup: {
    marginBottom: spacing.md + 2,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.size.sm + 1,
    color: colors.textPrimary,
  },
  chipScroll: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
    marginRight: spacing.xs + 2,
  },
  stateChipActive: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  stateChipText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  stateChipTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  categoryContainer: {
    marginTop: spacing.xs,
    gap: spacing.xs + 2,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  categoryOptionSelected: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  categoryText: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  categoryTextSelected: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
});

export default FirstTimeSetupPage;
