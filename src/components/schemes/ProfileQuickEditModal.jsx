/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';

const COMMON_STATES = ['Karnataka', 'Maharashtra', 'Kerala', 'Tamil Nadu', 'Punjab', 'Himachal Pradesh'];

const ENTITY_TYPES = [
  { key: 'individual', label: 'Individual Beekeeper' },
  { key: 'farmer', label: 'Farmer / Cultivator' },
  { key: 'fpo_shg', label: 'FPO / SHG / Cooperative' },
  { key: 'enterprise', label: 'Micro Enterprise' },
];

const EXPERIENCE_LEVELS = [
  { key: 'beginner', label: 'Beginner (0–2 yrs)' },
  { key: 'intermediate', label: 'Intermediate (2–5 yrs)' },
  { key: 'commercial', label: 'Commercial (5+ yrs)' },
];

export function ProfileQuickEditModal({
  visible,
  currentProfile = {},
  onSave,
  onClose,
}) {
  const [state, setState] = useState(currentProfile.state || 'Karnataka');
  const [district, setDistrict] = useState(currentProfile.district || '');
  const [entityType, setEntityType] = useState(currentProfile.entityType || 'individual');
  const [experienceLevel, setExperienceLevel] = useState(currentProfile.experienceLevel || 'intermediate');
  const [landStatus, setLandStatus] = useState(currentProfile.landStatus || 'owned');
  const [madhukrantiRegistered, setMadhukrantiRegistered] = useState(Boolean(currentProfile.madhukrantiRegistered));
  const [saving, setSaving] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (visible) {
      setState(currentProfile.state || 'Karnataka');
      setDistrict(currentProfile.district || '');
      setEntityType(currentProfile.entityType || 'individual');
      setExperienceLevel(currentProfile.experienceLevel || 'intermediate');
      setLandStatus(currentProfile.landStatus || 'owned');
      setMadhukrantiRegistered(Boolean(currentProfile.madhukrantiRegistered));
    }
  }, [visible, currentProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        state: state.trim(),
        district: district.trim(),
        entityType,
        experienceLevel,
        landStatus,
        madhukrantiRegistered,
      });
      onClose();
    } catch (err) {
      console.warn('Failed to update profile:', err?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <View style={styles.badgeRow}>
                <View style={styles.honeyBadge}>
                  <Ionicons name="sparkles" size={12} color={colors.primaryDark} />
                  <Text style={styles.honeyBadgeText}>Smart Profile</Text>
                </View>
              </View>
              <Text style={styles.title}>Beekeeping Profile</Text>
              <Text style={styles.subtitle}>Optional details for accurate government scheme matching</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* State Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>State Location</Text>
              <View style={styles.chipRow}>
                {COMMON_STATES.map((st) => {
                  const isActive = state.toLowerCase() === st.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setState(st)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {st}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={13} color={colors.primaryDark} style={{ marginLeft: 3 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Or type custom state name"
                placeholderTextColor={colors.textMuted}
                value={state}
                onChangeText={setState}
              />
            </View>

            {/* District */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>District</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Kodagu, Bengaluru Rural, Mysuru"
                placeholderTextColor={colors.textMuted}
                value={district}
                onChangeText={setDistrict}
              />
            </View>

            {/* Entity / Business Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Beekeeper / Entity Type</Text>
              <View style={styles.chipRow}>
                {ENTITY_TYPES.map((type) => {
                  const isActive = entityType === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setEntityType(type.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {type.label}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={13} color={colors.primaryDark} style={{ marginLeft: 3 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Experience Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Beekeeping Scale & Experience</Text>
              <View style={styles.chipRow}>
                {EXPERIENCE_LEVELS.map((exp) => {
                  const isActive = experienceLevel === exp.key;
                  return (
                    <TouchableOpacity
                      key={exp.key}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setExperienceLevel(exp.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {exp.label}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={13} color={colors.primaryDark} style={{ marginLeft: 3 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Madhukranti Portal Registration Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchIconBox}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Madhukranti Portal Registered</Text>
                <Text style={styles.switchSub}>
                  National Bee Board digital identity for traceability and NBHM benefits
                </Text>
              </View>
              <Switch
                value={madhukrantiRegistered}
                onValueChange={setMadhukrantiRegistered}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                thumbColor={colors.cardSurface}
              />
            </View>

            {/* Privacy Guarantee Note */}
            <View style={styles.privacyNote}>
              <Ionicons name="lock-closed" size={13} color={colors.sage} />
              <Text style={styles.privacyText}>
                Stored securely on your HoneyChain profile strictly for matching relevant central & state schemes.
              </Text>
            </View>

            {/* Save Button */}
            <AppButton
              title={saving ? "Saving Profile..." : "Save Profile Details"}
              variant="primary"
              size="lg"
              loading={saving}
              disabled={saving}
              onPress={handleSave}
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 33, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderBottomWidth: 0,
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  honeyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  honeyBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  scrollBody: {
    padding: spacing.lg,
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
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  textInput: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  switchIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  switchTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  switchSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  privacyText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
});

export default ProfileQuickEditModal;
