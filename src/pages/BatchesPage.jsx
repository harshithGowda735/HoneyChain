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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import BatchCard from '../components/batches/BatchCard';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import AppButton from '../components/common/AppButton';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';
import QRCodeModal from '../components/batches/QRCodeModal';
import QRScannerModal from '../components/batches/QRScannerModal';
import PublicVerificationModal from '../components/batches/PublicVerificationModal';

const STAGE_OPTIONS = [
  'Harvested',
  'Extraction',
  'Settling',
  'Jarred',
  'Lab Certified',
];

export function BatchesPage({
  batches = [],
  filteredBatches = [],
  hives = [],
  searchQuery = '',
  onSearchChange,
  selectedBatch,
  onSelectBatch,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
  loading = false,
  error = null,
  onRefresh,
}) {
  const { isRealAuthConnected } = useAuth();

  // Modals
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');

  // Form State
  const [selectedHiveId, setSelectedHiveId] = useState('');
  const [honeyType, setHoneyType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [moisture, setMoisture] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [stage, setStage] = useState('Harvested');
  const [notes, setNotes] = useState('');
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCardPress = (batch) => {
    onSelectBatch(batch.id);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
  };

  const openAddModal = (batchToEdit = null) => {
    if (batchToEdit) {
      setEditingBatchId(batchToEdit.id);
      setSelectedHiveId(batchToEdit.hiveId || (hives[0]?.id || ''));
      setHoneyType(batchToEdit.honeyType || batchToEdit.floralSource || '');
      setQuantity(String(batchToEdit.quantity || batchToEdit.quantityKg || ''));
      setMoisture(batchToEdit.moisture || batchToEdit.moistureContent || '');
      setHarvestDate(batchToEdit.harvestDate || '');
      setStage(batchToEdit.status || batchToEdit.stage || 'Harvested');
      setNotes(batchToEdit.notes || '');
    } else {
      setEditingBatchId(null);
      setSelectedHiveId(hives[0]?.id || '');
      setHoneyType('');
      setQuantity('');
      setMoisture('');
      setHarvestDate(new Date().toISOString().split('T')[0]);
      setStage('Harvested');
      setNotes('');
    }
    setFormError('');
    setAddModalVisible(true);
  };

  const handleSaveBatch = async () => {
    if (!selectedHiveId) {
      setFormError('Please select a source hive colony.');
      return;
    }
    if (!honeyType.trim()) {
      setFormError('Honey floral source/type is required.');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        hiveId: selectedHiveId,
        honeyType: honeyType.trim(),
        quantity: qty,
        moisture: moisture.trim(),
        harvestDate: harvestDate || new Date().toISOString().split('T')[0],
        status: stage,
        notes: notes.trim(),
      };

      if (editingBatchId) {
        if (onUpdateBatch) await onUpdateBatch(editingBatchId, payload);
      } else {
        if (onAddBatch) await onAddBatch(payload);
      }

      setAddModalVisible(false);
      if (editingBatchId && selectedBatch) {
        onSelectBatch(editingBatchId);
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save batch record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = (batchId) => {
    Alert.alert(
      'Delete Honey Batch',
      'Are you sure you want to delete this batch record from Firestore? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDeleteBatch) await onDeleteBatch(batchId);
              setDetailModalVisible(false);
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete batch.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={globalStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={globalStyles.screenTitle}>Honey Batches</Text>
            <Text style={globalStyles.sectionSubtitle}>
              {batches.length} registered honey {batches.length === 1 ? 'batch' : 'batches'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <AppButton
              title="Scan QR"
              iconName="camera-outline"
              size="sm"
              variant="outline"
              onPress={() => setScannerModalVisible(true)}
            />
            <AppButton
              title="Add Batch"
              iconName="add"
              size="sm"
              variant="primary"
              onPress={() => {
                if (hives.length === 0) {
                  Alert.alert(
                    'No Colonies Registered',
                    'You must register at least one hive before logging a harvest batch so the origin can be verified.'
                  );
                  return;
                }
                openAddModal();
              }}
            />
          </View>
        </View>

        {/* Error Alert */}
        {error ? (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.status.critical.text} />
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        ) : null}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search batch code, floral source, or stage..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Batches List */}
        {loading && batches.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading harvest lots from Firestore...</Text>
          </View>
        ) : filteredBatches.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title={batches.length === 0 ? 'No honey batches logged yet' : 'No batches found'}
            description={
              batches.length === 0
                ? 'Record your first honey extraction lot using the "Add Batch" button above.'
                : 'Try adjusting your search criteria.'
            }
            actionTitle={batches.length === 0 ? 'Log First Batch' : 'Reset Search'}
            onActionPress={() => {
              if (batches.length === 0) {
                if (hives.length === 0) {
                  Alert.alert('Register a Hive First', 'Create a colony record first so batches have a verified origin.');
                } else {
                  openAddModal();
                }
              } else {
                onSearchChange('');
              }
            }}
          />
        ) : (
          filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onPress={handleCardPress}
            />
          ))
        )}
      </ScrollView>

      {/* Batch Details Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBatch && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalBadgeRow}>
                      <View style={styles.amberBadge}>
                        <Ionicons name="ribbon-outline" size={12} color={colors.accentDeep} />
                        <Text style={styles.amberBadgeText}>
                          {selectedBatch.batchCode || selectedBatch.id}
                        </Text>
                      </View>
                      <StatusBadge status={selectedBatch.status || selectedBatch.stage || 'Harvested'} />
                    </View>
                    <Text style={styles.modalTitle}>
                      {selectedBatch.honeyType || selectedBatch.floralSource || 'Raw Honey'}
                    </Text>
                    <Text style={styles.modalSubcode}>
                      Firestore ID: {selectedBatch.id?.length > 10 ? selectedBatch.id.slice(0, 10) + '…' : selectedBatch.id}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleCloseDetailModal}
                    style={styles.modalCloseButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Key Lot Metrics */}
                <View style={styles.lotSummaryBox}>
                  <View style={styles.lotSummaryItem}>
                    <Text style={styles.lotLabel}>Quantity</Text>
                    <Text style={styles.lotValue}>
                      {Number(selectedBatch.quantity || selectedBatch.quantityKg || 0).toFixed(1)} {selectedBatch.unit || 'kg'}
                    </Text>
                  </View>
                  <View style={styles.lotSummaryItem}>
                    <Text style={styles.lotLabel}>Harvest Date</Text>
                    <Text style={styles.lotValue}>{formatDate(selectedBatch.harvestDate)}</Text>
                  </View>
                  <View style={styles.lotSummaryItem}>
                    <Text style={styles.lotLabel}>Origin Hive</Text>
                    <Text style={styles.lotValue} numberOfLines={1}>
                      {selectedBatch.hiveName || 'Verified Colony'}
                    </Text>
                  </View>
                  <View style={styles.lotSummaryItem}>
                    <Text style={styles.lotLabel}>Moisture</Text>
                    <Text style={styles.lotValue}>
                      {selectedBatch.moisture || selectedBatch.moistureContent || 'Untested'}
                    </Text>
                  </View>
                </View>

                {/* Field Notes */}
                {selectedBatch.notes ? (
                  <>
                    <Text style={styles.sectionHeading}>Batch Notes</Text>
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{selectedBatch.notes}</Text>
                    </View>
                  </>
                ) : null}

                {/* Real QR Generation & Consumer Verification Card */}
                <View style={styles.qrActionCard}>
                  <View style={styles.qrHeaderRow}>
                    <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
                    <Text style={styles.qrCardTitle}>Honey Traceability Label</Text>
                    <View style={styles.qrBadge}>
                      <Text style={styles.qrBadgeText}>ACTIVE REGISTRY</Text>
                    </View>
                  </View>

                  <Text style={styles.qrDisclaimer}>
                    Unique QR label generated for this harvest lot. Consumers can scan jars with any smartphone camera to verify purity and origin.
                  </Text>

                  <View style={styles.qrButtonRow}>
                    <AppButton
                      title="Generate / View QR"
                      iconName="qr-code"
                      variant="primary"
                      size="sm"
                      onPress={() => setQrModalVisible(true)}
                      style={{ flex: 1 }}
                    />
                    <AppButton
                      title="Consumer View"
                      iconName="eye-outline"
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setVerifyCode(selectedBatch.batchCode || selectedBatch.id);
                        setVerifyModalVisible(true);
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>

                {/* Action Buttons: Edit / Delete */}
                <View style={styles.modalActionButtons}>
                  <AppButton
                    title="Edit Batch"
                    iconName="create-outline"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      handleCloseDetailModal();
                      openAddModal(selectedBatch);
                    }}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    title="Delete"
                    iconName="trash-outline"
                    variant="ghost"
                    size="sm"
                    textStyle={{ color: colors.status.critical.text }}
                    onPress={() => handleDeleteBatch(selectedBatch.id)}
                  />
                </View>

                {/* Close Button */}
                <AppButton
                  title="Close Details"
                  variant="primary"
                  size="md"
                  onPress={handleCloseDetailModal}
                  style={styles.modalCloseBtn}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add / Edit Batch Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingBatchId ? 'Edit Honey Batch' : 'Log Harvest Batch'}
                </Text>
                <Text style={styles.modalSubtitle}>Save harvest lot records to Cloud Firestore</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.formErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.status.critical.text} />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Select Source Hive (Strictly from user's hives) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Source Hive Colony *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    {hives.map((h) => {
                      const isSelected = selectedHiveId === h.id;
                      return (
                        <TouchableOpacity
                          key={h.id}
                          onPress={() => setSelectedHiveId(h.id)}
                          style={[
                            styles.hiveSelectChip,
                            isSelected && styles.hiveSelectChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.hiveSelectText,
                              isSelected && styles.hiveSelectTextActive,
                            ]}
                          >
                            {h.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Floral Source / Honey Type *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Wildflower & Clover Honey"
                  placeholderTextColor={colors.textMuted}
                  value={honeyType}
                  onChangeText={setHoneyType}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Quantity (kg) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 45.5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Moisture (% RH)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 17.2%"
                    placeholderTextColor={colors.textMuted}
                    value={moisture}
                    onChangeText={setMoisture}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Harvest Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2026-10-11"
                  placeholderTextColor={colors.textMuted}
                  value={harvestDate}
                  onChangeText={setHarvestDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Production Stage</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    {STAGE_OPTIONS.map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setStage(st)}
                        style={[
                          styles.stageSelectBtn,
                          stage === st && styles.stageSelectBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stageSelectText,
                            stage === st && styles.stageSelectTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Harvest Notes</Text>
                <TextInput
                  style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                  placeholder="Extraction notes, floral aromas, filtration details..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              <AppButton
                title={isSubmitting ? 'Saving...' : editingBatchId ? 'Update Batch' : 'Log Honey Batch'}
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={handleSaveBatch}
                style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Real QR Display & Print/Share Modal */}
      <QRCodeModal
        visible={qrModalVisible}
        batch={selectedBatch}
        onClose={() => setQrModalVisible(false)}
        onPreviewVerification={(code) => {
          setVerifyCode(code);
          setVerifyModalVisible(true);
        }}
      />

      {/* Camera QR Scanner Modal with Manual Fallback */}
      <QRScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onScanSuccess={(code) => {
          setScannerModalVisible(false);
          setVerifyCode(code);
          setVerifyModalVisible(true);
        }}
      />

      {/* Public Consumer Verification Modal */}
      <PublicVerificationModal
        visible={verifyModalVisible}
        batchCode={verifyCode}
        onClose={() => {
          setVerifyModalVisible(false);
          setVerifyCode('');
        }}
        onScanAnother={() => {
          setVerifyModalVisible(false);
          setScannerModalVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.sm + 1,
    color: colors.textPrimary,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  errorAlertText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },

  // Modal styles
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
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  amberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  amberBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
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
  modalSubcode: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
  },
  lotSummaryBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  lotSummaryItem: {
    width: '45%',
  },
  lotLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 2,
  },
  lotValue: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sectionHeading: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notesBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  qrActionCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  qrCardTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    flex: 1,
  },
  qrBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  qrBadgeText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.accentDeep,
  },
  qrDisclaimer: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  qrButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  qrCodeBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  qrCodePayloadLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  qrCodePayload: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: 2,
    textAlign: 'center',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalCloseBtn: {
    marginBottom: spacing.md,
  },

  // Form styles
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.critical.bg,
    borderWidth: 1,
    borderColor: colors.status.critical.border,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  formErrorText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.sm + 1,
    color: colors.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  hiveSelectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  hiveSelectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hiveSelectText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  hiveSelectTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
  stageSelectBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  stageSelectBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  stageSelectText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  stageSelectTextActive: {
    color: colors.accentDeep,
    fontWeight: typography.weight.bold,
  },
});

export default BatchesPage;
