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
import HiveCard from '../components/hives/HiveCard';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import AppButton from '../components/common/AppButton';
import { formatTemperature, formatHumidity, formatWeight, formatBattery } from '../utils/formatSensorValue';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function HivesPage({
  hives = [],
  filteredHives = [],
  batches = [],
  searchQuery = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  selectedHive,
  onSelectHive,
  onAddHive,
  onUpdateHive,
  onDeleteHive,
  onAddReading,
  loading = false,
  error = null,
  onRefresh,
}) {
  const { isRealAuthConnected } = useAuth();
  const { t } = useLanguage();

  const statusFilters = [
    { key: 'all', label: t('filterAllHives') },
    { key: 'healthy', label: t('healthyStatus') },
    { key: 'attention', label: t('attentionStatus') },
    { key: 'critical', label: t('criticalStatus') },
  ];

  // Modals
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [readingModalVisible, setReadingModalVisible] = useState(false);

  // Hive Form State
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState('healthy');
  const [formQueenStatus, setFormQueenStatus] = useState('Marked - Active');
  const [formFrames, setFormFrames] = useState('10');
  const [formSupers, setFormSupers] = useState('1');
  const [formNotes, setFormNotes] = useState('');
  const [editingHiveId, setEditingHiveId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Reading Form State
  const [readingTemp, setReadingTemp] = useState('');
  const [readingHumidity, setReadingHumidity] = useState('');
  const [readingWeight, setReadingWeight] = useState('');
  const [readingNotes, setReadingNotes] = useState('');
  const [isSubmittingReading, setIsSubmittingReading] = useState(false);

  const handleCardPress = (hive) => {
    onSelectHive(hive.id);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
  };

  const openAddModal = (hiveToEdit = null) => {
    if (hiveToEdit) {
      setEditingHiveId(hiveToEdit.id);
      setFormName(hiveToEdit.name || '');
      setFormLocation(hiveToEdit.location || hiveToEdit.yard || '');
      setFormStatus(hiveToEdit.status || 'healthy');
      setFormQueenStatus(hiveToEdit.queenStatus || 'Marked - Active');
      setFormFrames(String(hiveToEdit.framesCount || '10'));
      setFormSupers(String(hiveToEdit.honeySuperCount || '1'));
      setFormNotes(hiveToEdit.notes || '');
    } else {
      setEditingHiveId(null);
      setFormName('');
      setFormLocation('');
      setFormStatus('healthy');
      setFormQueenStatus('Marked - Active');
      setFormFrames('10');
      setFormSupers('1');
      setFormNotes('');
    }
    setFormError('');
    setAddModalVisible(true);
  };

  const handleSaveHive = async () => {
    if (!formName.trim()) {
      setFormError('Hive name is required.');
      return;
    }
    if (!formLocation.trim()) {
      setFormError('Yard or location is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formName.trim(),
        location: formLocation.trim(),
        status: formStatus,
        queenStatus: formQueenStatus,
        framesCount: Number(formFrames) || 10,
        honeySuperCount: Number(formSupers) || 1,
        notes: formNotes.trim(),
      };

      if (editingHiveId) {
        if (onUpdateHive) await onUpdateHive(editingHiveId, payload);
      } else {
        if (onAddHive) await onAddHive(payload);
      }

      setAddModalVisible(false);
      if (editingHiveId && selectedHive) {
        // Keep detail modal updated
        onSelectHive(editingHiveId);
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save hive.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHive = (hiveId) => {
    const linkedBatches = batches.filter((b) => b.hiveId === hiveId);
    if (linkedBatches.length > 0) {
      Alert.alert(
        'Cannot Delete Hive',
        `This hive is referenced by ${linkedBatches.length} honey batch record(s) (e.g. ${linkedBatches[0].batchCode}). To prevent breaking traceability data, please delete or reassign associated batches first.`
      );
      return;
    }

    Alert.alert(
      'Delete Colony',
      'Are you sure you want to delete this colony record from Firestore? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDeleteHive) await onDeleteHive(hiveId);
              setDetailModalVisible(false);
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete hive.');
            }
          },
        },
      ]
    );
  };

  const handleAddReading = async () => {
    if (!selectedHive) return;
    setIsSubmittingReading(true);

    try {
      const payload = {
        temperature: readingTemp ? Number(readingTemp) : null,
        humidity: readingHumidity ? Number(readingHumidity) : null,
        weight: readingWeight ? Number(readingWeight) : null,
        source: 'manual',
        notes: readingNotes.trim(),
      };

      if (onAddReading) {
        await onAddReading(selectedHive.id, payload);
      }
      setReadingTemp('');
      setReadingHumidity('');
      setReadingWeight('');
      setReadingNotes('');
      setReadingModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to record sensor reading.');
    } finally {
      setIsSubmittingReading(false);
    }
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
            <Text style={globalStyles.screenTitle}>My Hives</Text>
            <Text style={globalStyles.sectionSubtitle}>
              {hives.length} registered {hives.length === 1 ? 'colony' : 'colonies'}
            </Text>
          </View>

          <AppButton
            title="Add Hive"
            iconName="add"
            size="sm"
            variant="primary"
            onPress={() => openAddModal()}
          />
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
            placeholder="Search hive ID, name, or yard..."
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

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.key;
            const count =
              filter.key === 'all'
                ? hives.length
                : hives.filter((h) => h.status === filter.key).length;

            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.7}
                onPress={() => onStatusFilterChange(filter.key)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hives List */}
        {loading && hives.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading hives from Firestore...</Text>
          </View>
        ) : filteredHives.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            title={hives.length === 0 ? 'No colonies registered yet' : 'No hives matched filter'}
            description={
              hives.length === 0
                ? 'Register your first colony in Firestore using the "Add Hive" button above.'
                : 'Try clearing your search query or switching status filters.'
            }
            actionTitle={hives.length === 0 ? 'Add First Hive' : 'Reset Filters'}
            onActionPress={() => {
              if (hives.length === 0) {
                openAddModal();
              } else {
                onSearchChange('');
                onStatusFilterChange('all');
              }
            }}
          />
        ) : (
          filteredHives.map((hive) => (
            <HiveCard
              key={hive.id}
              hive={hive}
              onPress={handleCardPress}
            />
          ))
        )}
      </ScrollView>

      {/* Hive Details Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedHive && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalBadgeRow}>
                      <View style={styles.hiveIdTag}>
                        <Text style={styles.hiveIdTagText}>
                          {selectedHive.id?.length > 10 ? selectedHive.id.slice(0, 8) + '…' : selectedHive.id}
                        </Text>
                      </View>
                      <StatusBadge status={selectedHive.status || 'healthy'} />
                    </View>
                    <Text style={styles.modalTitle}>{selectedHive.name}</Text>
                    <View style={styles.modalYardRow}>
                      <Ionicons name="location" size={14} color={colors.primary} />
                      <Text style={styles.modalYardText}>
                        {selectedHive.location || selectedHive.yard || 'Apiary Location'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleCloseDetailModal}
                    style={styles.modalCloseButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Honest Hardware Notice Banner */}
                <View style={styles.hardwareBanner}>
                  <Ionicons name="hardware-chip-outline" size={16} color={colors.primary} />
                  <Text style={styles.hardwareBannerText}>
                    Hardware Status: Awaiting physical ESP32 sensor link.
                  </Text>
                </View>

                {/* Telemetry Metrics Grid */}
                <Text style={styles.subSectionTitle}>Core Telemetry Readings</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Brood Temp</Text>
                    <Text style={[styles.metricBigValue, { color: colors.sensor.temp }]}>
                      {typeof selectedHive.temperature === 'number'
                        ? formatTemperature(selectedHive.temperature)
                        : '--'}
                    </Text>
                    <Text style={styles.metricSub}>
                      {typeof selectedHive.temperature === 'number' ? 'Recorded' : 'Awaiting sensor'}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Humidity</Text>
                    <Text style={[styles.metricBigValue, { color: colors.sensor.humidity }]}>
                      {typeof selectedHive.humidity === 'number'
                        ? formatHumidity(selectedHive.humidity)
                        : '--'}
                    </Text>
                    <Text style={styles.metricSub}>
                      {typeof selectedHive.humidity === 'number' ? 'Recorded' : 'Awaiting sensor'}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Scale Weight</Text>
                    <Text style={[styles.metricBigValue, { color: colors.sensor.weight }]}>
                      {typeof selectedHive.weight === 'number'
                        ? formatWeight(selectedHive.weight)
                        : '--'}
                    </Text>
                    <Text style={styles.metricSub}>
                      {typeof selectedHive.weight === 'number' ? 'Scale reading' : 'No scale attached'}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Node Battery</Text>
                    <Text style={[styles.metricBigValue, { color: colors.sensor.battery }]}>
                      {typeof selectedHive.battery === 'number'
                        ? formatBattery(selectedHive.battery)
                        : '--'}
                    </Text>
                    <Text style={styles.metricSub}>
                      {typeof selectedHive.battery === 'number' ? 'Node active' : 'No node telemetry'}
                    </Text>
                  </View>
                </View>

                {/* Colony Health & Queen Details */}
                <Text style={styles.subSectionTitle}>Colony & Frame Configuration</Text>
                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Queen Status</Text>
                    <Text style={styles.detailVal}>{selectedHive.queenStatus || 'Unrecorded'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Brood Frames</Text>
                    <Text style={styles.detailVal}>{selectedHive.framesCount || 10} Frames</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Honey Supers</Text>
                    <Text style={styles.detailVal}>{selectedHive.honeySuperCount || 1} Supers</Text>
                  </View>
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailKey}>Created</Text>
                    <Text style={styles.detailVal}>
                      {selectedHive.createdAt ? formatDate(selectedHive.createdAt) : 'Recently'}
                    </Text>
                  </View>
                </View>

                {/* Beekeeper Field Notes */}
                {selectedHive.notes ? (
                  <>
                    <Text style={styles.subSectionTitle}>Field Notes</Text>
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{selectedHive.notes}</Text>
                    </View>
                  </>
                ) : null}

                {/* Action Buttons Row: Edit / Log Reading / Delete */}
                <View style={styles.modalActionButtons}>
                  <AppButton
                    title="Log Reading"
                    iconName="thermometer-outline"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setReadingModalVisible(true);
                    }}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    title="Edit Hive"
                    iconName="create-outline"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      handleCloseDetailModal();
                      openAddModal(selectedHive);
                    }}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    title="Delete"
                    iconName="trash-outline"
                    variant="ghost"
                    size="sm"
                    textStyle={{ color: colors.status.critical.text }}
                    onPress={() => handleDeleteHive(selectedHive.id)}
                  />
                </View>

                {/* Close Button */}
                <AppButton
                  title="Close Inspection"
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

      {/* Add / Edit Hive Modal */}
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
                  {editingHiveId ? 'Edit Colony Record' : 'Register New Hive'}
                </Text>
                <Text style={styles.modalSubtitle}>Save colony metadata directly to Cloud Firestore</Text>
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
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hive / Colony Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Clover Ridge #1"
                  placeholderTextColor={colors.textMuted}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Yard Location *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. North Basin Yard"
                  placeholderTextColor={colors.textMuted}
                  value={formLocation}
                  onChangeText={setFormLocation}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Colony Health Status</Text>
                <View style={styles.statusSelectRow}>
                  {['healthy', 'attention', 'critical'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setFormStatus(st)}
                      style={[
                        styles.statusSelectBtn,
                        formStatus === st && styles.statusSelectBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusSelectText,
                          formStatus === st && styles.statusSelectTextActive,
                        ]}
                      >
                        {st.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Queen Status</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Marked (Yellow) - Active Brood"
                  placeholderTextColor={colors.textMuted}
                  value={formQueenStatus}
                  onChangeText={setFormQueenStatus}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Brood Frames</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={formFrames}
                    onChangeText={setFormFrames}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Honey Supers</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={formSupers}
                    onChangeText={setFormSupers}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Field Notes</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Observations from latest inspection..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={formNotes}
                  onChangeText={setFormNotes}
                />
              </View>

              <AppButton
                title={isSubmitting ? 'Saving...' : editingHiveId ? 'Update Hive' : 'Create Hive'}
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={handleSaveHive}
                style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Log Reading Modal */}
      <Modal
        visible={readingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReadingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Inspection Reading</Text>
                <Text style={styles.modalSubtitle}>Save manual temperature/humidity measurements</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReadingModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Internal Brood Temp (°C)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 34.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={readingTemp}
                  onChangeText={setReadingTemp}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relative Humidity (%)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 58"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={readingHumidity}
                  onChangeText={setReadingHumidity}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Scale Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 42.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={readingWeight}
                  onChangeText={setReadingWeight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Probe placement notes..."
                  placeholderTextColor={colors.textMuted}
                  value={readingNotes}
                  onChangeText={setReadingNotes}
                />
              </View>

              <AppButton
                title={isSubmittingReading ? 'Recording...' : 'Save Reading to Firestore'}
                variant="primary"
                size="lg"
                loading={isSubmittingReading}
                disabled={isSubmittingReading}
                onPress={handleAddReading}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  filterChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
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
  hiveIdTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  hiveIdTagText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
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
  modalYardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modalYardText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
  },
  modalCloseButton: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
  },
  hardwareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  hardwareBannerText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  subSectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricBigValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  detailKey: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
  },
  detailVal: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
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
  statusSelectRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  statusSelectBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusSelectText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  statusSelectTextActive: {
    color: colors.textInverse,
  },
  rowInputs: {
    flexDirection: 'row',
  },
});

export default HivesPage;
