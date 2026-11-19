import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import AppButton from '../components/common/AppButton';
import LanguageSelector from '../components/common/LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { pickProfileImage } from '../services/storageService';
import { HoneycombPattern, BotanicalAccent } from '../components/illustrations';

const ENTITY_OPTIONS = [
  { value: 'farmer', label: 'Individual Farmer' },
  { value: 'fpo_shg', label: 'FPO / SHG Member' },
  { value: 'enterprise', label: 'Commercial Beekeeper' },
];

export function ProfilePage() {
  const { user, userProfile, currentUser, updateProfile, signOut } = useAuth();
  const { t } = useLanguage();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Edit Form Fields
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formApiaryName, setFormApiaryName] = useState('');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formEntityType, setFormEntityType] = useState('farmer');
  const [tempUnitCelsius, setTempUnitCelsius] = useState(true);

  const openEditModal = () => {
    setFormDisplayName(currentUser?.name || userProfile?.displayName || '');
    setFormApiaryName(currentUser?.apiaryName || userProfile?.apiaryName || '');
    setFormState(userProfile?.state || 'Karnataka');
    setFormDistrict(userProfile?.district || '');
    setFormEntityType(userProfile?.entityType || 'farmer');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    try {
      await updateProfile({
        displayName: formDisplayName.trim(),
        apiaryName: formApiaryName.trim(),
        state: formState.trim(),
        district: formDistrict.trim(),
        entityType: formEntityType,
      });
      setEditModalVisible(false);
      Alert.alert(t('success'), (t('saveProfile') || 'Profile Saved') + ' ✓');
    } catch (err) {
      Alert.alert(t('error'), err?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      const picked = await pickProfileImage();
      if (picked && picked.persistentUrl) {
        await updateProfile({
          photoUrl: picked.persistentUrl,
        });
        Alert.alert(t('success'), t('photoUploaded') || 'Profile photo updated');
      }
    } catch (err) {
      Alert.alert(t('error'), err?.message || 'Failed to update profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      'Are you sure you want to sign out of HoneyChain?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('signOut'),
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await signOut();
            } catch (err) {
              Alert.alert(t('error'), err?.message || 'Failed to sign out.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const getAvatarInitials = () => {
    const name = currentUser?.name || userProfile?.displayName || '';
    if (name) {
      return name.slice(0, 2).toUpperCase();
    }
    return 'BK';
  };

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={globalStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{t('profileTitle')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('profileSubtitle')}
          </Text>
        </View>

        {/* Beekeeper Profile Hero Card */}
        <View style={styles.heroCard}>
          {/* Subtle Honeycomb Backdrop */}
          <View style={styles.heroPatternWrapper} pointerEvents="none">
            <HoneycombPattern size={120} opacity={0.12} />
          </View>
          <View style={styles.heroBotanicalWrapper} pointerEvents="none">
            <BotanicalAccent size={48} opacity={0.2} />
          </View>

          <View style={styles.heroTopRow}>
            {/* Avatar with Photo or Monogram */}
            <TouchableOpacity
              onPress={handleChangePhoto}
              style={styles.avatarWrapper}
              activeOpacity={0.85}
              disabled={isUploadingPhoto}
            >
              {currentUser?.photoUrl ? (
                <Image
                  source={{ uri: currentUser.photoUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{getAvatarInitials()}</Text>
                </View>
              )}

              {/* Edit Camera Overlay Badge */}
              <View style={styles.cameraIconBadge}>
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFDF7" />
                ) : (
                  <Ionicons name="camera" size={13} color="#FFFDF7" />
                )}
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.beekeeperName} numberOfLines={1}>
                  {currentUser?.name || userProfile?.displayName || 'Lead Beekeeper'}
                </Text>
              </View>

              {/* Verified Badge */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.sage} />
                <Text style={styles.verifiedBadgeText}>Verified Beekeeper</Text>
              </View>

              <Text style={styles.beekeeperPhone}>
                📱 {currentUser?.phoneNumber || user?.phoneNumber || 'Mobile Registered'}
              </Text>
            </View>
          </View>

          {/* Quick Edit Action Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={openEditModal}
            activeOpacity={0.75}
          >
            <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.editProfileButtonText}>Edit Profile Info</Text>
          </TouchableOpacity>
        </View>

        {/* Apiary & Location Information Card */}
        <Text style={styles.sectionHeader}>Apiary & Location</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="home" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{t('apiaryNameLabel')}</Text>
              <Text style={styles.infoValue}>
                {currentUser?.apiaryName || userProfile?.apiaryName || 'Cauvery Honey Farm'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="location" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Jurisdiction / Region</Text>
              <Text style={styles.infoValue}>
                {userProfile?.district ? `${userProfile.district}, ` : ''}{userProfile?.state || 'Karnataka'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="people" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{t('beekeeperCategory')}</Text>
              <Text style={styles.infoValue}>
                {userProfile?.entityType === 'enterprise'
                  ? 'Commercial Beekeeper'
                  : userProfile?.entityType === 'fpo_shg'
                    ? 'FPO / SHG Member'
                    : 'Individual Farmer'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="finger-print" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Account Identity</Text>
              <Text style={styles.uidText} numberOfLines={1} selectable>
                {user?.uid ? `ID: ${user.uid.slice(0, 14)}...` : 'HoneyChain Authorized'}
              </Text>
            </View>
          </View>
        </View>

        {/* Language & Unit Preferences */}
        <Text style={styles.sectionHeader}>{t('languagePreference')}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{t('language')}</Text>
              <Text style={styles.settingSubtitle}>English / ಕನ್ನಡ / हिन्दी</Text>
            </View>
            <LanguageSelector compact={true} />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{t('temperatureUnit')}</Text>
              <Text style={styles.settingSubtitle}>
                {tempUnitCelsius ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
              </Text>
            </View>
            <Switch
              value={tempUnitCelsius}
              onValueChange={setTempUnitCelsius}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              thumbColor={colors.cardSurface}
            />
          </View>
        </View>

        {/* Sign Out Action */}
        <View style={styles.signOutSection}>
          <AppButton
            title={isSigningOut ? 'Signing out...' : t('signOut')}
            variant="outline"
            size="md"
            iconName="log-out-outline"
            disabled={isSigningOut}
            loading={isSigningOut}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          />
        </View>

        <Text style={styles.versionText}>HoneyChain v1.0.0 • Pure Honey Traceability</Text>
      </ScrollView>

      {/* Edit Profile Bottom Sheet Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Beekeeper Profile</Text>
                <Text style={styles.modalSubtitle}>Update your apiary and location details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('nameLabel')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={formDisplayName}
                  onChangeText={setFormDisplayName}
                  placeholder={t('namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('apiaryNameLabel')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={formApiaryName}
                  onChangeText={setFormApiaryName}
                  placeholder={t('apiaryNamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>{t('stateLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formState}
                    onChangeText={setFormState}
                    placeholder="Karnataka"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>{t('districtLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formDistrict}
                    onChangeText={setFormDistrict}
                    placeholder="e.g. Kodagu"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('beekeeperCategory')}</Text>
                <View style={styles.entityOptionsRow}>
                  {ENTITY_OPTIONS.map((opt) => {
                    const isActive = formEntityType === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.entityChip,
                          isActive && styles.entityChipActive,
                        ]}
                        onPress={() => setFormEntityType(opt.value)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.entityChipText,
                            isActive && styles.entityChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isActive && (
                          <Ionicons name="checkmark-circle" size={14} color={colors.primaryDark} style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <AppButton
                title={isUpdating ? t('loading') : (t('saveProfile') || 'Save Profile Details')}
                variant="primary"
                size="lg"
                loading={isUpdating}
                disabled={isUpdating}
                onPress={handleSaveProfile}
                style={styles.saveProfileModalBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.card,
  },
  heroPatternWrapper: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  heroBotanicalWrapper: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSecondary,
  },
  avatarInitials: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  beekeeperName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.sage,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  beekeeperPhone: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  editProfileButtonText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  sectionHeader: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  uidText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  settingTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOutSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  signOutBtn: {
    width: '100%',
    borderColor: colors.status.critical.border,
    backgroundColor: colors.surface,
  },
  versionText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 33, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderBottomWidth: 0,
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    backgroundColor: colors.cardSurface,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  entityOptionsRow: {
    gap: spacing.xs + 2,
  },
  entityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.cardSurface,
  },
  entityChipActive: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  entityChipText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  entityChipTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  saveProfileModalBtn: {
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

export default ProfilePage;
