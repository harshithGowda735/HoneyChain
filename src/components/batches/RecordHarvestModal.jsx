import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { useLanguage } from '../../context/LanguageContext';

const FLORAL_SUGGESTIONS = [
  'Multifloral',
  'Mustard (Sarson)',
  'Forest (Wild)',
  'Jamun',
  'Eucalyptus',
  'Sunflower',
  'Acacia',
];

export function RecordHarvestModal({
  visible,
  hives = [],
  onClose,
  onSubmitHarvest,
  onOpenAddHive,
  onViewQrForBatch,
}) {
  const { t } = useLanguage();

  // Form State
  const [selectedHiveIds, setSelectedHiveIds] = useState([]);
  const [harvestDate, setHarvestDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [honeyType, setHoneyType] = useState('');
  const [moisture, setMoisture] = useState('');
  const [notes, setNotes] = useState('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdBatch, setCreatedBatch] = useState(null);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (visible) {
      setHarvestDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setHoneyType('');
      setMoisture('');
      setNotes('');
      setFormError('');
      setCreatedBatch(null);

      // Pre-select first hive if available
      if (hives.length === 1) {
        setSelectedHiveIds([hives[0].id]);
      } else {
        setSelectedHiveIds([]);
      }
    }
  }, [visible, hives]);

  const toggleHiveSelection = (hiveId) => {
    setSelectedHiveIds((prev) => {
      if (prev.includes(hiveId)) {
        return prev.filter((id) => id !== hiveId);
      } else {
        return [...prev, hiveId];
      }
    });
  };

  const handleSelectAllHives = () => {
    if (selectedHiveIds.length === hives.length) {
      setSelectedHiveIds([]);
    } else {
      setSelectedHiveIds(hives.map((h) => h.id));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (selectedHiveIds.length === 0) {
      setFormError(t('selectAtLeastOneHive'));
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Please enter a valid positive harvest quantity in kilograms.');
      return;
    }

    if (!honeyType.trim()) {
      setFormError('Please enter the floral source or honey type.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // Gather source hive names for traceability record
      const selectedHivesList = hives.filter((h) => selectedHiveIds.includes(h.id));
      const sourceHiveNames = selectedHivesList.map((h) => h.name || h.id);
      const primaryHive = selectedHivesList[0];

      const harvestPayload = {
        hiveId: primaryHive.id, // Primary source hive for backwards compatibility & rules
        sourceHiveIds: selectedHiveIds,
        sourceHiveNames,
        quantity: qty,
        unit: 'kg',
        honeyType: honeyType.trim(),
        harvestDate: harvestDate || new Date().toISOString().split('T')[0],
        moisture: moisture.trim(),
        notes: notes.trim(),
        status: 'Harvested',
      };

      const result = await onSubmitHarvest(harvestPayload);
      setCreatedBatch(result);
    } catch (err) {
      setFormError(err?.message || 'Failed to save harvest record. Please try again.');
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
              <Text style={styles.title}>{t('recordHarvestTitle')}</Text>
              <Text style={styles.subtitle}>{t('recordHarvestSub')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Success Screen */}
          {createdBatch ? (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={54} color={colors.status.healthy.indicator} />
              </View>
              <Text style={styles.successTitle}>{t('harvestSuccessTitle')}</Text>
              <Text style={styles.successSub}>{t('harvestSuccessSub')}</Text>

              <View style={styles.batchInfoPill}>
                <Text style={styles.batchInfoLabel}>{t('batchCodeLabel')}:</Text>
                <Text style={styles.batchInfoValue}>{createdBatch.batchCode}</Text>
              </View>

              <View style={styles.successSummaryCard}>
                <Text style={styles.summaryRow}>
                  🍯 {createdBatch.honeyType} • {createdBatch.quantity} kg
                </Text>
                <Text style={styles.summaryRowSub}>
                  {t('sourceHivesLabel')}: {createdBatch.sourceHiveNames?.join(', ') || createdBatch.hiveName}
                </Text>
              </View>

              <View style={styles.successActions}>
                {onViewQrForBatch && (
                  <AppButton
                    title={t('viewQrLabelBtn')}
                    iconName="qr-code-outline"
                    variant="primary"
                    size="lg"
                    onPress={() => {
                      onClose();
                      onViewQrForBatch(createdBatch);
                    }}
                    style={{ width: '100%', marginBottom: spacing.sm }}
                  />
                )}
                <AppButton
                  title={t('doneBtn')}
                  variant="outline"
                  size="md"
                  onPress={onClose}
                  style={{ width: '100%' }}
                />
              </View>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Form Error Banner */}
              {formError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={colors.status.critical.text} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Step 1: Select Source Hives */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>1. {t('selectSourceHives')} *</Text>
                  {hives.length > 1 && (
                    <TouchableOpacity onPress={handleSelectAllHives}>
                      <Text style={styles.selectAllText}>
                        {selectedHiveIds.length === hives.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {hives.length === 0 ? (
                  <View style={styles.noHivesWarning}>
                    <Ionicons name="warning-outline" size={24} color={colors.accentDeep} />
                    <Text style={styles.noHivesText}>
                      No colonies registered yet. You must register at least one hive before recording a harvest.
                    </Text>
                    <AppButton
                      title={t('addHive')}
                      iconName="add-circle-outline"
                      variant="primary"
                      size="sm"
                      onPress={() => {
                        onClose();
                        onOpenAddHive && onOpenAddHive();
                      }}
                      style={{ marginTop: spacing.sm }}
                    />
                  </View>
                ) : (
                  <View style={styles.hivesGrid}>
                    {hives.map((hive) => {
                      const isSelected = selectedHiveIds.includes(hive.id);
                      return (
                        <TouchableOpacity
                          key={hive.id}
                          style={[styles.hiveChip, isSelected && styles.hiveChipSelected]}
                          onPress={() => toggleHiveSelection(hive.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={isSelected ? colors.primary : colors.textMuted}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.hiveChipName, isSelected && styles.hiveChipNameSelected]}>
                              {hive.name || `Hive ${hive.id.slice(0, 5)}`}
                            </Text>
                            <Text style={styles.hiveChipLoc} numberOfLines={1}>
                              {hive.location || 'Apiary yard'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {selectedHiveIds.length > 0 && (
                  <Text style={styles.selectedCountNote}>
                    ✓ {t('selectedHivesCount').replace('{count}', String(selectedHiveIds.length))}
                  </Text>
                )}
              </View>

              {/* Step 2: Harvest Details */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>2. Harvest Metrics</Text>

                {/* Net Quantity (kg) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('harvestQuantityLabel')} *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="scale-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('harvestQuantityPlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                    />
                    <Text style={styles.unitSuffix}>kg</Text>
                  </View>
                </View>

                {/* Floral Source / Honey Type */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('floralSourceLabel')} *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="flower-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('floralSourcePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={honeyType}
                      onChangeText={setHoneyType}
                      editable={!isSubmitting}
                    />
                  </View>
                  {/* Quick suggestion chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                    {FLORAL_SUGGESTIONS.map((sug) => (
                      <TouchableOpacity
                        key={sug}
                        style={[styles.suggestionChip, honeyType === sug && styles.suggestionChipActive]}
                        onPress={() => setHoneyType(sug)}
                      >
                        <Text style={[styles.suggestionText, honeyType === sug && styles.suggestionTextActive]}>
                          {sug}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Harvest Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('harvestDateLabel')} (YYYY-MM-DD)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={harvestDate}
                      onChangeText={setHarvestDate}
                      editable={!isSubmitting}
                    />
                  </View>
                </View>

                {/* Moisture Content (%) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('moistureLabel')}</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="water-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('moisturePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={moisture}
                      onChangeText={setMoisture}
                      keyboardType="decimal-pad"
                      editable={!isSubmitting}
                    />
                    <Text style={styles.unitSuffix}>%</Text>
                  </View>
                  <Text style={styles.fieldHint}>Pure Indian honey standard: ≤ 20% moisture</Text>
                </View>

                {/* Extraction Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('harvestNotesLabel')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('harvestNotesPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <AppButton
                title={isSubmitting ? t('savingHarvest') : t('saveHarvestBatchBtn')}
                iconName="checkmark-done-outline"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting || hives.length === 0}
                onPress={handleSubmit}
                style={styles.submitBtn}
              />
            </ScrollView>
          )}
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
    maxHeight: '92%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
  },
  scrollBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  selectAllText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  noHivesWarning: {
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accentLight,
    alignItems: 'center',
    gap: spacing.xs,
  },
  noHivesText: {
    fontSize: typography.size.xs + 1,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  hivesGrid: {
    gap: spacing.xs,
  },
  hiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  hiveChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  hiveChipName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  hiveChipNameSelected: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  hiveChipLoc: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
  },
  selectedCountNote: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: typography.size.sm + 1,
    color: colors.textPrimary,
  },
  unitSuffix: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  fieldHint: {
    fontSize: typography.size.xs - 1,
    color: colors.textMuted,
    marginTop: 4,
  },
  textArea: {
    height: 72,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  suggestionsScroll: {
    marginTop: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  suggestionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionText: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  suggestionTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  submitBtn: {
    width: '100%',
    marginTop: spacing.xs,
  },
  successBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.status.healthy.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successSub: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  batchInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  batchInfoLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  batchInfoValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  successSummaryCard: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  summaryRow: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  summaryRowSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  successActions: {
    width: '100%',
  },
});

export default RecordHarvestModal;
