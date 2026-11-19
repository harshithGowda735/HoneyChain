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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { useLanguage } from '../../context/LanguageContext';
import { HoneyJarIllustration } from '../illustrations/HoneyJarIllustration';

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
    if (selectedHiveIds.length === 0) {
      setFormError(t('selectAtLeastOneHive'));
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      setFormError('Please enter a valid harvest quantity in kg (e.g. 12.5).');
      return;
    }

    if (!honeyType.trim()) {
      setFormError('Please specify the floral source or honey type.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const selectedHivesList = hives.filter((h) => selectedHiveIds.includes(h.id));
      const sourceHives = selectedHivesList.map((h) => ({
        id: h.id,
        name: h.name,
        location: h.location || h.yard || 'Apiary',
      }));

      const primaryHive = selectedHivesList[0] || {};
      const payload = {
        hiveId: primaryHive.id || null,
        hiveName: primaryHive.name || 'Apiary',
        sourceHiveIds: selectedHiveIds,
        sourceHives,
        harvestDate: harvestDate || new Date().toISOString(),
        quantity: qtyNum,
        honeyType: honeyType.trim(),
        moistureContent: moisture ? parseFloat(moisture) : null,
        notes: notes.trim(),
        stage: 'Extraction',
      };

      if (onSubmitHarvest) {
        const resultBatch = await onSubmitHarvest(payload);
        setCreatedBatch(resultBatch || payload);
      } else {
        onClose();
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to record harvest.');
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
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <HoneyJarIllustration size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('recordHarvestTitle')}</Text>
                <Text style={styles.subtitle}>{t('recordHarvestSub')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {createdBatch ? (
            /* Success & QR View Screen */
            <View style={styles.successBox}>
              <HoneyJarIllustration size={72} />
              <Text style={styles.successTitle}>{t('harvestSuccessTitle')}</Text>
              <Text style={styles.successSub}>{t('harvestSuccessSub')}</Text>

              <View style={styles.batchInfoPill}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primaryDark} />
                <Text style={styles.batchInfoLabel}>BATCH CODE:</Text>
                <Text style={styles.batchInfoValue}>
                  {createdBatch.batchCode || createdBatch.id || 'HC-2026-PENDING'}
                </Text>
              </View>

              <View style={styles.successSummaryCard}>
                <Text style={styles.summaryRow}>
                  {createdBatch.quantity || quantity} kg • {createdBatch.honeyType || honeyType}
                </Text>
                <Text style={styles.summaryRowSub}>
                  Linked to {selectedHiveIds.length} source colony(ies)
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
                    style={{ marginBottom: spacing.sm }}
                  />
                )}

                <AppButton
                  title={t('doneBtn')}
                  variant="outline"
                  size="md"
                  onPress={onClose}
                />
              </View>
            </View>
          ) : (
            /* Form Body */
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* 1. Source Colonies Selection */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>{t('selectSourceHives')}</Text>
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
                    <Ionicons name="warning-outline" size={24} color={colors.warning} />
                    <Text style={styles.noHivesText}>
                      No colonies registered yet. Register at least one hive to record a harvest.
                    </Text>
                    {onOpenAddHive && (
                      <AppButton
                        title="Add First Colony"
                        variant="primary"
                        size="sm"
                        onPress={onOpenAddHive}
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.hivesGrid}>
                    {hives.map((hive) => {
                      const isSelected = selectedHiveIds.includes(hive.id);
                      return (
                        <TouchableOpacity
                          key={hive.id}
                          activeOpacity={0.75}
                          onPress={() => toggleHiveSelection(hive.id)}
                          style={[styles.hiveChip, isSelected && styles.hiveChipSelected]}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={isSelected ? colors.primaryDark : colors.textMuted}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.hiveChipName, isSelected && styles.hiveChipNameSelected]}
                              numberOfLines={1}
                            >
                              {hive.name}
                            </Text>
                            <Text style={styles.hiveChipLoc} numberOfLines={1}>
                              {hive.location || 'Apiary'} • {hive.honeySuperCount || 1} Supers
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {selectedHiveIds.length > 0 && (
                  <Text style={styles.selectedCountNote}>
                    ✓ {t('selectedHivesCount', { count: selectedHiveIds.length })}
                  </Text>
                )}
              </View>

              {/* 2. Extraction & Quantity Details */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Extraction Details</Text>

                {/* Net Quantity (kg) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('harvestQuantityLabel')} *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="scale-outline" size={18} color={colors.primaryDark} style={styles.inputIcon} />
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
                    <Ionicons name="leaf-outline" size={18} color={colors.sage} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('floralSourcePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={honeyType}
                      onChangeText={setHoneyType}
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* Floral suggestion chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.suggestionsScroll}
                  >
                    {FLORAL_SUGGESTIONS.map((sugg) => (
                      <TouchableOpacity
                        key={sugg}
                        onPress={() => setHoneyType(sugg)}
                        style={[
                          styles.suggestionChip,
                          honeyType === sugg && styles.suggestionChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            honeyType === sugg && styles.suggestionTextActive,
                          ]}
                        >
                          {sugg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Moisture Content (%) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('moistureLabel')}</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="water-outline" size={18} color={colors.sensor.humidity} style={styles.inputIcon} />
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
    backgroundColor: 'rgba(73, 61, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '92%',
    minHeight: '60%',
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    paddingBottom: spacing.xxl,
  },
  formSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
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
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  noHivesWarning: {
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  hiveChipSelected: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.softAmber,
  },
  hiveChipName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  hiveChipNameSelected: {
    color: colors.primaryDark,
    fontWeight: typography.weight.bold,
  },
  hiveChipLoc: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
  },
  selectedCountNote: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
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
    backgroundColor: colors.background,
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
    height: 44,
    fontSize: typography.size.sm,
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
    height: 70,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  suggestionsScroll: {
    marginTop: spacing.xs + 2,
  },
  suggestionChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  suggestionChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  suggestionText: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  suggestionTextActive: {
    color: '#FFFFFF',
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
  successTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
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
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  batchInfoLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  batchInfoValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  successSummaryCard: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
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
