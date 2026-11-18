import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Colony Inspection & Care</Text>
              <Text style={styles.subtitle}>
                {hive.name} • {hive.location || 'Apiary Yard'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Task Type Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[styles.typeOption, taskType === 'inspection' && styles.typeOptionActive]}
                onPress={() => setTaskType('inspection')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    taskType === 'inspection' && styles.typeOptionTextActive,
                  ]}
                >
                  Inspection
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, taskType === 'cleaning' && styles.typeOptionActive]}
                onPress={() => setTaskType('cleaning')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    taskType === 'cleaning' && styles.typeOptionTextActive,
                  ]}
                >
                  Cleaning
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, taskType === 'both' && styles.typeOptionActive]}
                onPress={() => setTaskType('both')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    taskType === 'both' && styles.typeOptionTextActive,
                  ]}
                >
                  Full Service
                </Text>
              </TouchableOpacity>
            </View>

            {/* Checklist items */}
            {taskType !== 'cleaning' && (
              <View style={styles.checklistSection}>
                <Text style={styles.sectionTitle}>Inspection Checklist</Text>
                <View style={styles.checklistCard}>
                  {INSPECTION_CHECKLIST_ITEMS.map((item) => {
                    const isChecked = checklist[item.key] ?? false;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.checkItem}
                        onPress={() => toggleCheckItem(item.key)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.checkLabel, isChecked && styles.checkLabelChecked]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Observation Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Observation Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Comb condition, pollen foraging rate, queen egg pattern..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Submit Action */}
            <AppButton
              title={isSubmitting ? 'Saving...' : 'Save Inspection Log'}
              iconName="checkmark-circle-outline"
              variant="primary"
              size="lg"
              loading={isSubmitting}
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
    backgroundColor: 'rgba(73, 61, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
  },
  title: {
    fontSize: typography.size.md + 1,
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  scrollBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  typeOptionActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softAmber,
    ...shadows.sm,
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  checklistSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  checklistCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadows.sm,
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
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
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
  notesSection: {
    marginBottom: spacing.md,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 70,
    ...shadows.sm,
  },
});

export default HiveMaintenanceModal;
