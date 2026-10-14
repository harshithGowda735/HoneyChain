import React, { useState } from 'react';
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

const ENTITY_CATEGORIES = [
  { value: 'farmer', label: 'Individual Farmer', labelKn: 'ವೈಯಕ್ತಿಕ ಕೃಷಿಕ', labelHi: 'व्यक्तिगत किसान' },
  { value: 'fpo_shg', label: 'FPO / SHG Member', labelKn: 'FPO / ಸಂಘದ ಸದಸ್ಯ', labelHi: 'एफपीओ / एसएचजी सदस्य' },
  { value: 'enterprise', label: 'Commercial Beekeeper', labelKn: 'ವಾಣಿಜ್ಯ ಜೇನುಸಾಕಣೆದಾರ', labelHi: 'व्यावसायिक मधुमक्खी पालक' },
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

  // Automatically detect customer location upon loading
  useEffect(() => {
    handleDetectLocation(true);
  }, []);

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

  const handleDetectLocation = async (isAuto = false) => {
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
    } catch (err) {
      if (!isAuto) {
        Alert.alert('Location Notice', 'Could not fetch GPS coordinates. Please select your state manually.');
      }
    } finally {
      setIsDetectingLocation(false);
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="home" size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>Apiary Setup</Text>
          <Text style={styles.subtitle}>Set up your apiary profile</Text>
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Form Card */}
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
                  <Ionicons name="camera" size={24} color={colors.primary} />
                </View>
              )}
              <View style={styles.photoBadge}>
                <Ionicons name="add" size={14} color={colors.surface} />
              </View>
            </TouchableOpacity>
            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>Beekeeper Photo</Text>
              <Text style={styles.photoSub}>
                {photoUrl ? 'Tap to change photo' : 'Tap to add profile photo'}
              </Text>
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('nameLabel')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
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
              <Ionicons name="leaf-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
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
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="locate" size={13} color={colors.primary} />
                    <Text style={styles.detectLocationText}>
                      {locationDetectedNotice ? `📍 ${locationDetectedNotice}` : 'GPS Auto-Detect'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.7}
                  onPress={() => setSelectedState(st)}
                  style={[
                    styles.stateChip,
                    selectedState === st && styles.stateChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stateChipText,
                      selectedState === st && styles.stateChipTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* District / Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('districtLabel')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
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
                    activeOpacity={0.7}
                    onPress={() => setEntityType(cat.value)}
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.primary : colors.textMuted}
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
            title="Save & Continue"
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    ...shadows.card,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  photoPickerBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
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
    marginBottom: spacing.xs + 2,
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  detectLocationText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
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
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  chipScroll: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  stateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.xs + 2,
  },
  stateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stateChipText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  stateChipTextActive: {
    color: colors.textInverse,
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
    backgroundColor: colors.surfaceSubtle,
    gap: spacing.sm,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  categoryTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});

export default FirstTimeSetupPage;
