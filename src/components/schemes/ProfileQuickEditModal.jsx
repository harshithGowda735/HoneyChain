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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
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
            <View>
              <Text style={styles.title}>Beekeeping Profile</Text>
              <Text style={styles.subtitle}>Optional details for accurate scheme matching</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* State Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>State Location</Text>
              <View style={styles.chipRow}>
                {COMMON_STATES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, state.toLowerCase() === st.toLowerCase() && styles.chipActive]}
                    onPress={() => setState(st)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        state.toLowerCase() === st.toLowerCase() && styles.chipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Or type state name"
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
                {ENTITY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.chip, entityType === type.key && styles.chipActive]}
                    onPress={() => setEntityType(type.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        entityType === type.key && styles.chipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Experience Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Beekeeping Scale & Experience</Text>
              <View style={styles.chipRow}>
                {EXPERIENCE_LEVELS.map((exp) => (
                  <TouchableOpacity
                    key={exp.key}
                    style={[styles.chip, experienceLevel === exp.key && styles.chipActive]}
                    onPress={() => setExperienceLevel(exp.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        experienceLevel === exp.key && styles.chipTextActive,
                      ]}
                    >
                      {exp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Madhukranti Portal Registration Switch */}
            <View style={styles.switchRow}>
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
                thumbColor={colors.surface}
              />
            </View>

            {/* Privacy Guarantee Note */}
            <View style={styles.privacyNote}>
              <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
              <Text style={styles.privacyText}>
                These details are stored privately in your encrypted HoneyChain profile strictly for matching relevant schemes.
              </Text>
            </View>

            {/* Save Button */}
            <AppButton
              title="Save Profile Details"
              variant="primary"
              size="lg"
              loading={saving}
              onPress={handleSave}
              style={{ marginTop: spacing.md }}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
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
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollBody: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
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
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  privacyText: {
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
});

export default ProfileQuickEditModal;
