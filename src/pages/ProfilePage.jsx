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
import AppCard from '../components/common/AppCard';
import LanguageSelector from '../components/common/LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { pickProfileImage } from '../services/storageService';

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
      Alert.alert(t('success'), t('saveProfile') + ' ✓');
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
        Alert.alert(t('success'), t('photoUploaded'));
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
          <Text style={globalStyles.screenTitle}>{t('profileTitle')}</Text>
          <Text style={globalStyles.sectionSubtitle}>
            {t('profileSubtitle')}
          </Text>
        </View>

        {/* Beekeeper Profile Card */}
        <AppCard elevation="card" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {/* Avatar with Photo or Fallback Initials */}
            <TouchableOpacity
              onPress={handleChangePhoto}
              style={styles.avatarWrapper}
              activeOpacity={0.8}
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

              {/* Edit Camera Overlay Icon */}
              <View style={styles.cameraIconBadge}>
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="camera" size={13} color={colors.surface} />
                )}
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.beekeeperName}>
                  {currentUser?.name || 'Beekeeper'}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>

              <Text style={styles.beekeeperRole}>{currentUser?.role || 'Beekeeper'}</Text>
              <Text style={styles.beekeeperPhone}>
                📱 {currentUser?.phoneNumber || user?.phoneNumber || 'Mobile Registered'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.editProfileButtonText}>Edit Profile Info</Text>
          </TouchableOpacity>
        </AppCard>

        {/* Apiary Information Card */}
        <Text style={styles.sectionHeader}>Apiary & Location</Text>
        <AppCard elevation="card" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="home-outline" size={18} color={colors.primary} />
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
              <Ionicons name="location-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Jurisdiction / State</Text>
              <Text style={styles.infoValue}>
                {userProfile?.district ? `${userProfile.district}, ` : ''}{userProfile?.state || 'Karnataka'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
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
              <Ionicons name="finger-print-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Farmer UID</Text>
              <Text style={styles.uidText} numberOfLines={1} selectable>
                {user?.uid}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Language Preferences (Only place authenticated users change language) */}
        <Text style={styles.sectionHeader}>{t('languagePreference')}</Text>
        <AppCard elevation="card" style={styles.infoCard}>
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
              thumbColor={colors.surface}
            />
          </View>
        </AppCard>

        {/* Sign Out Action */}
        <View style={styles.signOutSection}>
          <AppButton
            title={isSigningOut ? '...' : t('signOut')}
            variant="outline"
            size="md"
            iconName="log-out-outline"
            disabled={isSigningOut}
            loading={isSigningOut}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          />
        </View>

        <Text style={styles.versionText}>
          HoneyChain Version 1.0.0 (KVIC / NBHM Architecture Ready)
        </Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Beekeeper Profile</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                    placeholder="e.g. Mandya"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('beekeeperCategory')}</Text>
                <View style={styles.entityOptionsRow}>
                  {ENTITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.entityChip,
                        formEntityType === opt.value && styles.entityChipActive,
                      ]}
                      onPress={() => setFormEntityType(opt.value)}
                    >
                      <Text
                        style={[
                          styles.entityChipText,
                          formEntityType === opt.value && styles.entityChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <AppButton
                title={isUpdating ? t('loading') : t('saveProfile')}
                variant="primary"
                size="lg"
                loading={isUpdating}
                disabled={isUpdating}
                onPress={handleSaveProfile}
                style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
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
  profileCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  profileHeader: {
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceSubtle,
  },
  avatarInitials: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.surface,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  beekeeperName: {
    fontSize: typography.size.md + 2,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  beekeeperRole: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  beekeeperPhone: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editProfileButtonText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  sectionHeader: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  infoCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  uidText: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  settingTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOutSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  signOutBtn: {
    width: '100%',
    borderColor: colors.status.critical.border,
  },
  versionText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSubtle,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  entityOptionsRow: {
    gap: spacing.xs,
  },
  entityChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceSubtle,
  },
  entityChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  entityChipText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  entityChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
});

export default ProfilePage;
