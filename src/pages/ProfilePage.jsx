import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import AppCard from '../components/common/AppCard';
import AppButton from '../components/common/AppButton';
import config from '../constants/config';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, currentUser, userProfile, updateProfile, signOut } = useAuth();
  const [tempUnitCelsius, setTempUnitCelsius] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editApiaryName, setEditApiaryName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');

  const openEditModal = () => {
    setEditDisplayName(userProfile?.displayName || user?.displayName || '');
    setEditApiaryName(userProfile?.apiaryName || config.defaultApiaryName);
    setEditError('');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      setEditError('Please enter a display name.');
      return;
    }

    setIsSavingProfile(true);
    setEditError('');

    try {
      await updateProfile({
        displayName: editDisplayName.trim(),
        apiaryName: editApiaryName.trim() || config.defaultApiaryName,
      });
      setEditModalVisible(false);
    } catch (err) {
      setEditError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of HoneyChain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await signOut();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to sign out.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const getAvatarInitials = () => {
    if (userProfile?.displayName) {
      return userProfile.displayName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'AP';
  };

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={globalStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={globalStyles.screenTitle}>Profile</Text>
          <Text style={globalStyles.sectionSubtitle}>
            Account credentials & apiary settings
          </Text>
        </View>

        {/* Beekeeper Profile Card */}
        <AppCard elevation="card" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getAvatarInitials()}</Text>
            </View>
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
              <Text style={styles.beekeeperEmail} numberOfLines={1}>
                {user?.email}
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
        <Text style={styles.sectionHeader}>Apiary Details</Text>
        <AppCard elevation="card" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="home-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Facility Name</Text>
              <Text style={styles.infoValue}>
                {currentUser?.apiaryName || config.defaultApiaryName}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="finger-print-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Firebase UID</Text>
              <Text style={styles.uidText} numberOfLines={1} selectable>
                {user?.uid}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Preferences & Settings */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <AppCard elevation="card" style={styles.infoCard}>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Temperature Unit (°C)</Text>
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
            title={isSigningOut ? 'Signing out...' : 'Sign Out'}
            variant="outline"
            size="md"
            iconName="log-out-outline"
            disabled={isSigningOut}
            loading={isSigningOut}
            onPress={handleSignOut}
            style={styles.signOutButton}
            textStyle={{ color: colors.status.critical.text }}
          />
        </View>

        {/* App Version Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerVersion}>HoneyChain v{config.appVersion}</Text>
          <Text style={styles.footerSub}>Smart Apiary Management & Honey Traceability</Text>
        </View>
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
              <View>
                <Text style={styles.modalTitle}>Edit Beekeeper Profile</Text>
                <Text style={styles.modalSubtitle}>Update your display name and apiary facility</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {editError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.status.critical.text} />
                <Text style={styles.errorBannerText}>{editError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Beekeeper Name *</Text>
              <View style={styles.inputFieldContainer}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Marcus Vance"
                  placeholderTextColor={colors.textMuted}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  editable={!isSavingProfile}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apiary Facility Name</Text>
              <View style={styles.inputFieldContainer}>
                <Ionicons
                  name="home-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Meadowbrook Apiaries"
                  placeholderTextColor={colors.textMuted}
                  value={editApiaryName}
                  onChangeText={setEditApiaryName}
                  editable={!isSavingProfile}
                />
              </View>
            </View>

            <AppButton
              title={isSavingProfile ? 'Saving...' : 'Save Profile'}
              variant="primary"
              size="lg"
              loading={isSavingProfile}
              disabled={isSavingProfile || !editDisplayName.trim()}
              onPress={handleSaveProfile}
              style={{ marginTop: spacing.md }}
            />
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
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInitials: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  beekeeperName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySoft,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  beekeeperRole: {
    fontSize: typography.size.sm,
    color: colors.accentDeep,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  beekeeperEmail: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editProfileButtonText: {
    fontSize: typography.size.xs + 1,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  sectionHeader: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  infoCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  uidText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.weight.medium,
    marginTop: 2,
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
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOutSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  signOutButton: {
    borderColor: colors.status.critical.border,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerVersion: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
  },
  footerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
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
  errorBannerText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
});

export default ProfilePage;
