import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { INSPECTION_CHECKLIST_ITEMS } from '../../services/maintenanceService';

export function HiveMaintenanceModal({
  visible,
  hive,
  onClose,
  onSaveMaintenance,
}) {
  const [taskType, setTaskType] = useState('both'); // 'inspection' | 'cleaning' | 'both'
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState({
    queenSpotted: true,
    broodPattern: true,
    foodStores: true,
    pestCheck: true,
    bottomBoard: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hive) return null;

  const toggleCheckItem = (key) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (onSaveMaintenance) {
        await onSaveMaintenance(hive.id, {
          type: taskType,
          hiveName: hive.name,
          notes,
          checklist,
        });
      }
      onClose();
    } catch (err) {
      console.log('Error saving maintenance:', err);
    } finally {
      setIsSubmitting(false);
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
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Colony Maintenance Log</Text>
              <Text style={styles.subtitle}>
                {hive.name} • {hive.location || 'Apiary'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Task Type Switcher */}
            <View style={styles.typeSwitcher}>
              {[
                { key: 'both', label: 'Inspect & Clean' },
                { key: 'inspection', label: 'Inspection Only' },
                { key: 'cleaning', label: 'Cleaning Only' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.typeOption, taskType === opt.key && styles.typeOptionActive]}
                  onPress={() => setTaskType(opt.key)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      taskType === opt.key && styles.typeOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Checklist */}
            <Text style={styles.sectionTitle}>Verification Checklist</Text>
            <View style={styles.checklistCard}>
              {INSPECTION_CHECKLIST_ITEMS.map((item) => {
                const isChecked = checklist[item.key] ?? false;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.checkItem}
                    activeOpacity={0.7}
                    onPress={() => toggleCheckItem(item.key)}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.checkLabel, isChecked && styles.checkLabelChecked]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={styles.sectionTitle}>Observation Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Brood pattern solid, 8 frames filled, added honey super."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Submit Button */}
            <AppButton
              title={isSubmitting ? 'Recording...' : 'Mark Completed & Save'}
              iconName="checkmark-circle-outline"
              variant="primary"
              size="lg"
              onPress={handleSave}
              disabled={isSubmitting}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  body: {
    paddingBottom: spacing.lg,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeOptionActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs + 2,
  },
  checklistCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  checkLabelChecked: {
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
  },
  notesInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
});

export default HiveMaintenanceModal;

