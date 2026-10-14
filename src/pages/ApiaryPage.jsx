import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import AppButton from '../components/common/AppButton';
import AppCard from '../components/common/AppCard';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import HiveWeightTrendChart from '../components/telemetry/HiveWeightTrendChart';
import RecordHarvestModal from '../components/batches/RecordHarvestModal';
import QRCodeModal from '../components/batches/QRCodeModal';
import { formatDate } from '../utils/formatDate';
import {
  determineSensorConnectionStatus,
  getRecentHiveReadings,
} from '../services/sensorService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function ApiaryPage({
  hives = [],
  batches = [],
  loading = false,
  error = null,
  onRefresh,
  onAddHive,
  onUpdateHive,
  onDeleteHive,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
  onAddReading,
  onOpenScanner,
  onOpenPublicVerify,
}) {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Active Selected Hive & Batch for detail modals
  const [selectedHive, setSelectedHive] = useState(null);
  const [selectedHiveReadings, setSelectedHiveReadings] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Load historical readings when selectedHive changes
  React.useEffect(() => {
    let isMounted = true;
    if (selectedHive?.id && user?.uid) {
      getRecentHiveReadings(selectedHive.id, user.uid, 50).then((list) => {
        if (isMounted) {
          // If no readings in subcollection but hive has weight property, create baseline
          if (list.length === 0 && (typeof selectedHive.weight === 'number' || typeof selectedHive.latestWeight === 'number')) {
            setSelectedHiveReadings([
              {
                weight: selectedHive.weight ?? selectedHive.latestWeight,
                temperature: selectedHive.temperature,
                humidity: selectedHive.humidity,
                recordedAt: selectedHive.updatedAt || selectedHive.createdAt,
              },
            ]);
          } else {
            setSelectedHiveReadings(list);
          }
        }
      });
    } else {
      setSelectedHiveReadings([]);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedHive?.id, user?.uid]);

  // Modal Visibilities
  const [addHiveModalVisible, setAddHiveModalVisible] = useState(false);
  const [recordHarvestVisible, setRecordHarvestVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [batchDetailVisible, setBatchDetailVisible] = useState(false);
  const [addReadingModalVisible, setAddReadingModalVisible] = useState(false);

  // Form State: Add/Edit Hive
  const [editingHiveId, setEditingHiveId] = useState(null);
  const [formHiveName, setFormHiveName] = useState('');
  const [formHiveLocation, setFormHiveLocation] = useState('');
  const [formHiveStatus, setFormHiveStatus] = useState('healthy');
  const [formQueenStatus, setFormQueenStatus] = useState('Marked - Active');
  const [formFramesCount, setFormFramesCount] = useState('10');
  const [formSupersCount, setFormSupersCount] = useState('1');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingHive, setIsSubmittingHive] = useState(false);
  const [hiveFormError, setHiveFormError] = useState('');

  // Form State: Manual Scale / Sensor Reading
  const [readingWeight, setReadingWeight] = useState('');
  const [readingTemp, setReadingTemp] = useState('');
  const [readingHumidity, setReadingHumidity] = useState('');
  const [readingNotes, setReadingNotes] = useState('');
  const [isSubmittingReading, setIsSubmittingReading] = useState(false);

  // Batch for QR viewing
  const [activeQrBatch, setActiveQrBatch] = useState(null);

  // 1. Hive Form Handlers
  const handleOpenAddHive = (hiveToEdit = null) => {
    if (hiveToEdit) {
      setEditingHiveId(hiveToEdit.id);
      setFormHiveName(hiveToEdit.name || '');
      setFormHiveLocation(hiveToEdit.location || hiveToEdit.yard || '');
      setFormHiveStatus(hiveToEdit.status || 'healthy');
      setFormQueenStatus(hiveToEdit.queenStatus || 'Marked - Active');
      setFormFramesCount(String(hiveToEdit.framesCount || '10'));
      setFormSupersCount(String(hiveToEdit.honeySuperCount || '1'));
      setFormDeviceId(hiveToEdit.sensorDeviceId || hiveToEdit.deviceId || '');
      setFormNotes(hiveToEdit.notes || '');
    } else {
      setEditingHiveId(null);
      setFormHiveName('');
      setFormHiveLocation('');
      setFormHiveStatus('healthy');
      setFormQueenStatus('Marked - Active');
      setFormFramesCount('10');
      setFormSupersCount('1');
      setFormDeviceId('');
      setFormNotes('');
    }
    setHiveFormError('');
    setAddHiveModalVisible(true);
  };

  const handleSaveHive = async () => {
    if (!formHiveName.trim()) {
      setHiveFormError('Hive name is required.');
      return;
    }
    if (!formHiveLocation.trim()) {
      setHiveFormError('Yard or location is required.');
      return;
    }

    setIsSubmittingHive(true);
    setHiveFormError('');

    try {
      const payload = {
        name: formHiveName.trim(),
        location: formHiveLocation.trim(),
        status: formHiveStatus,
        queenStatus: formQueenStatus,
        framesCount: Number(formFramesCount) || 10,
        honeySuperCount: Number(formSupersCount) || 1,
        sensorDeviceId: formDeviceId.trim() || null,
        notes: formNotes.trim(),
      };

      if (editingHiveId) {
        if (onUpdateHive) await onUpdateHive(editingHiveId, payload);
        if (selectedHive && selectedHive.id === editingHiveId) {
          setSelectedHive({ ...selectedHive, ...payload });
        }
      } else {
        if (onAddHive) await onAddHive(payload);
      }
      setAddHiveModalVisible(false);
    } catch (err) {
      setHiveFormError(err?.message || 'Failed to save colony.');
    } finally {
      setIsSubmittingHive(false);
    }
  };

  const handleDeleteHive = (hiveId) => {
    const linkedBatches = batches.filter((b) => b.hiveId === hiveId);
    if (linkedBatches.length > 0) {
      Alert.alert(
        'Cannot Delete Colony',
        `This colony is referenced by ${linkedBatches.length} honey batch record(s). Please delete or reassign associated batches first to preserve traceability.`
      );
      return;
    }

    Alert.alert(
      'Delete Colony',
      'Are you sure you want to delete this colony record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDeleteHive) await onDeleteHive(hiveId);
              setSelectedHive(null);
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete colony.');
            }
          },
        },
      ]
    );
  };

  // 2. Reading Submission Handler
  const handleSaveReading = async () => {
    if (!selectedHive) return;

    const weightNum = readingWeight ? Number(readingWeight) : null;
    const tempNum = readingTemp ? Number(readingTemp) : null;
    const humNum = readingHumidity ? Number(readingHumidity) : null;

    if (weightNum === null && tempNum === null && humNum === null) {
      Alert.alert('Missing Value', 'Please enter at least one measurement (weight, temperature, or humidity).');
      return;
    }

    setIsSubmittingReading(true);
    try {
      const payload = {
        weight: weightNum,
        temperature: tempNum,
        humidity: humNum,
        source: 'manual',
        notes: readingNotes.trim(),
        deviceId: selectedHive.sensorDeviceId || null,
      };

      if (onAddReading) {
        await onAddReading(selectedHive.id, payload);
      }

      const newReadingItem = {
        ...payload,
        recordedAt: new Date().toISOString(),
      };
      setSelectedHiveReadings((prev) => [newReadingItem, ...prev]);

      // Update in-memory selectedHive reading
      setSelectedHive((prev) => ({
        ...prev,
        latestWeight: weightNum !== null ? weightNum : prev.latestWeight,
        weight: weightNum !== null ? weightNum : prev.weight,
        temperature: tempNum !== null ? tempNum : prev.temperature,
        humidity: humNum !== null ? humNum : prev.humidity,
      }));

      setReadingWeight('');
      setReadingTemp('');
      setReadingHumidity('');
      setReadingNotes('');
      setAddReadingModalVisible(false);
      Alert.alert('Measurement Saved', 'Scale reading added to colony weight history.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to record measurement.');
    } finally {
      setIsSubmittingReading(false);
    }
  };

  // 3. Harvest Submission
  const handleHarvestCreated = (newBatch) => {
    setRecordHarvestVisible(false);
    if (newBatch) {
      setActiveQrBatch(newBatch);
      setQrModalVisible(true);
    }
  };

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Page Top Header */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={globalStyles.screenTitle}>My Apiary</Text>
            <Text style={globalStyles.sectionSubtitle}>
              {hives.length} Hives • {batches.length} Batches
            </Text>
          </View>

          {onOpenScanner && (
            <TouchableOpacity
              onPress={onOpenScanner}
              style={styles.scanHeaderBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
              <Text style={styles.scanHeaderBtnText}>Scan Jar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Global Error Banner */}
        {error ? (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.status.critical.text} />
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        ) : null}

        {/* =========================================================================
            SECTION A: MY HIVES
           ========================================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithCount}>
              <Text style={styles.sectionTitle}>My Hives</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{hives.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleOpenAddHive()}
              style={styles.addSmallBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.surface} />
              <Text style={styles.addSmallBtnText}>Add Hive</Text>
            </TouchableOpacity>
          </View>

          {hives.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Ionicons name="grid-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyCardTitle}>No hives registered yet</Text>
              <Text style={styles.emptyCardSub}>
                Add your first hive to track weight and harvests.
              </Text>
              <TouchableOpacity
                onPress={() => handleOpenAddHive()}
                style={styles.emptyActionBtn}
              >
                <Text style={styles.emptyActionBtnText}>Register First Hive</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.hivesList}>
              {hives.map((hive) => {
                const sensorStatus = determineSensorConnectionStatus(hive, {
                  recordedAt: hive.updatedAt || hive.createdAt,
                });

                return (
                  <TouchableOpacity
                    key={hive.id}
                    style={styles.hiveRowCard}
                    activeOpacity={0.7}
                    onPress={() => setSelectedHive(hive)}
                  >
                    <View style={styles.hiveRowHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hiveRowName}>{hive.name}</Text>
                        <Text style={styles.hiveRowSub}>
                          {hive.location || 'Apiary Yard'} • {hive.queenStatus || 'Queen Active'}
                        </Text>
                      </View>
                      <StatusBadge status={hive.status || 'healthy'} />
                    </View>

                    {/* Sensor & Telemetry Metrics Strip */}
                    <View style={styles.telemetryStrip}>
                      <View style={styles.telemetryMetric}>
                        <Ionicons name="speedometer-outline" size={13} color={colors.primary} />
                        <Text style={styles.telemetryText}>
                          {typeof hive.weight === 'number' || typeof hive.latestWeight === 'number'
                            ? `${(hive.weight ?? hive.latestWeight).toFixed(1)} kg`
                            : '-- kg'}
                        </Text>
                      </View>

                      <View style={styles.telemetryDivider} />

                      <View style={styles.telemetryMetric}>
                        <Ionicons name="thermometer-outline" size={13} color={colors.sensor.temp} />
                        <Text style={styles.telemetryText}>
                          {typeof hive.temperature === 'number' ? `${hive.temperature} °C` : '-- °C'}
                        </Text>
                      </View>

                      <View style={styles.telemetryDivider} />

                      <View style={styles.telemetryMetric}>
                        <Ionicons name="water-outline" size={13} color={colors.sensor.humidity} />
                        <Text style={styles.telemetryText}>
                          {typeof hive.humidity === 'number' ? `${hive.humidity} %` : '-- %'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View
                          style={[
                            styles.sensorConnectionPill,
                            { backgroundColor: sensorStatus.badgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.sensorConnectionText,
                              { color: sensorStatus.badgeColor },
                            ]}
                          >
                            {sensorStatus.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* =========================================================================
            SECTION B: HONEY HARVESTS
           ========================================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithCount}>
              <Text style={styles.sectionTitle}>Honey Harvests</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{batches.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (hives.length === 0) {
                  Alert.alert(
                    'No Colonies Available',
                    'Please register at least one source hive colony before logging a harvest.'
                  );
                  return;
                }
                setRecordHarvestVisible(true);
              }}
              style={styles.harvestPrimaryBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.surface} />
              <Text style={styles.harvestPrimaryBtnText}>Record Harvest</Text>
            </TouchableOpacity>
          </View>

          {batches.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyCardTitle}>No harvests logged yet</Text>
              <Text style={styles.emptyCardSub}>
                Record honey to generate batch QR codes.
              </Text>
            </View>
          ) : (
            <View style={styles.recentHarvestsList}>
              {batches.slice(0, 5).map((batch) => (
                <View key={batch.id} style={styles.harvestRow}>
                  <View style={styles.harvestIconCircle}>
                    <Ionicons name="leaf" size={14} color={colors.accentDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.harvestTitle}>
                      {batch.honeyType || 'Pure Honey'} • {batch.quantity || 0} kg
                    </Text>
                    <Text style={styles.harvestSub}>
                      Harvested {formatDate(batch.harvestDate)} • Colony: {batch.hiveName || 'Registered Hives'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setActiveQrBatch(batch);
                      setQrModalVisible(true);
                    }}
                    style={styles.qrRowBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* =========================================================================
            SECTION C: HONEY TRACEABILITY
           ========================================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Honey Traceability</Text>
              <Text style={styles.sectionSubtitle}>
                Batch verification and jar QR codes
              </Text>
            </View>

            {onOpenScanner && (
              <TouchableOpacity
                onPress={onOpenScanner}
                style={styles.scanSecondaryBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={14} color={colors.primary} />
                <Text style={styles.scanSecondaryBtnText}>Scan QR</Text>
              </TouchableOpacity>
            )}
          </View>

          {batches.length === 0 ? (
            <View style={styles.traceabilityNoticeCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.traceabilityNoticeText}>
                Batches and jar QR codes appear here after recording a harvest.
              </Text>
            </View>
          ) : (
            <View style={styles.batchesList}>
              {batches.map((batch) => {
                const batchCode = batch.batchCode || batch.id;
                return (
                  <View key={batch.id} style={styles.batchCard}>
                    <View style={styles.batchCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.batchCodeRow}>
                          <Text style={styles.batchCodeText}>{batchCode}</Text>
                          <View style={styles.verifiedRegistryPill}>
                            <Text style={styles.verifiedRegistryText}>REGISTRY READY</Text>
                          </View>
                        </View>
                        <Text style={styles.batchMetaText}>
                          {batch.honeyType} • {batch.quantity || 0} kg • {formatDate(batch.harvestDate)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.batchActionsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveQrBatch(batch);
                          setQrModalVisible(true);
                        }}
                        style={styles.batchActionBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="qr-code" size={14} color={colors.primary} />
                        <Text style={styles.batchActionBtnText}>Generate / View QR</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          if (onOpenPublicVerify) {
                            onOpenPublicVerify(batchCode);
                          } else {
                            setActiveQrBatch(batch);
                            setQrModalVisible(true);
                          }
                        }}
                        style={styles.batchActionOutlineBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="eye-outline" size={14} color={colors.textPrimary} />
                        <Text style={styles.batchActionOutlineText}>Verify Jar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* =========================================================================
          HIVE DETAILS MODAL (WITH WEIGHT GROWTH GRAPH & MANUAL READING)
         ========================================================================= */}
      <Modal
        visible={Boolean(selectedHive)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedHive(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedHive && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedHive.name}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedHive.location} • {selectedHive.queenStatus}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedHive(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
                  {/* Status Banner */}
                  <View style={styles.detailStatsRow}>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatValue}>{selectedHive.framesCount || 10}</Text>
                      <Text style={styles.detailStatLabel}>Frames</Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatValue}>{selectedHive.honeySuperCount || 1}</Text>
                      <Text style={styles.detailStatLabel}>Honey Supers</Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatValue}>
                        {typeof selectedHive.temperature === 'number' ? `${selectedHive.temperature}°C` : '--'}
                      </Text>
                      <Text style={styles.detailStatLabel}>Temp</Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatValue}>
                        {typeof selectedHive.humidity === 'number' ? `${selectedHive.humidity}%` : '--'}
                      </Text>
                      <Text style={styles.detailStatLabel}>Humidity</Text>
                    </View>
                  </View>

                  {/* Weight Growth Graph Component */}
                  <HiveWeightTrendChart
                    hiveName={selectedHive.name}
                    readings={selectedHiveReadings}
                    onAddScaleReading={() => setAddReadingModalVisible(true)}
                  />

                  {/* Action Buttons in Modal */}
                  <View style={styles.detailActionsRow}>
                    <AppButton
                      title="Record Scale Reading"
                      iconName="add"
                      variant="primary"
                      size="sm"
                      onPress={() => setAddReadingModalVisible(true)}
                      style={{ flex: 1 }}
                    />
                    <AppButton
                      title="Edit"
                      iconName="create-outline"
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        const h = selectedHive;
                        setSelectedHive(null);
                        handleOpenAddHive(h);
                      }}
                    />
                    <AppButton
                      title="Delete"
                      iconName="trash-outline"
                      variant="danger"
                      size="sm"
                      onPress={() => handleDeleteHive(selectedHive.id)}
                    />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          RECORD SCALE / TELEMETRY MODAL
         ========================================================================= */}
      <Modal
        visible={addReadingModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddReadingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Scale Reading</Text>
              <TouchableOpacity onPress={() => setAddReadingModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hive Weight (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 26.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={readingWeight}
                  onChangeText={setReadingWeight}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Internal Temp (°C)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="34.5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={readingTemp}
                    onChangeText={setReadingTemp}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Humidity (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="55"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={readingHumidity}
                    onChangeText={setReadingHumidity}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observation Notes</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nectar flow, brood box weight..."
                  placeholderTextColor={colors.textMuted}
                  value={readingNotes}
                  onChangeText={setReadingNotes}
                />
              </View>

              <AppButton
                title="Save Measurement"
                variant="primary"
                size="md"
                loading={isSubmittingReading}
                onPress={handleSaveReading}
                style={{ marginTop: spacing.xs }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          ADD / EDIT HIVE MODAL
         ========================================================================= */}
      <Modal
        visible={addHiveModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddHiveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHiveId ? 'Edit Colony' : 'Register New Colony'}
              </Text>
              <TouchableOpacity onPress={() => setAddHiveModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {hiveFormError ? (
              <View style={styles.formErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.formErrorText}>{hiveFormError}</Text>
              </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Colony / Hive Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Hive Alpha, Colony #4"
                  placeholderTextColor={colors.textMuted}
                  value={formHiveName}
                  onChangeText={setFormHiveName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Yard Location *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. North Apiary, Coffee Plantation"
                  placeholderTextColor={colors.textMuted}
                  value={formHiveLocation}
                  onChangeText={setFormHiveLocation}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Frames Count</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={formFramesCount}
                    onChangeText={setFormFramesCount}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Honey Supers</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={formSupersCount}
                    onChangeText={setFormSupersCount}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ESP32 + HX711 Sensor Device ID (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. ESP32-SCALE-001"
                  placeholderTextColor={colors.textMuted}
                  value={formDeviceId}
                  onChangeText={setFormDeviceId}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Colony Notes</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  placeholder="Brood pattern, temperament..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={formNotes}
                  onChangeText={setFormNotes}
                />
              </View>

              <AppButton
                title={editingHiveId ? 'Update Hive Record' : 'Save & Register Hive'}
                variant="primary"
                size="lg"
                loading={isSubmittingHive}
                onPress={handleSaveHive}
                style={{ marginTop: spacing.sm }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global Record Harvest Modal */}
      <RecordHarvestModal
        visible={recordHarvestVisible}
        hives={hives}
        onClose={() => setRecordHarvestVisible(false)}
        onSubmitHarvest={onAddBatch}
        onOpenAddHive={() => {
          setRecordHarvestVisible(false);
          handleOpenAddHive();
        }}
        onViewQrForBatch={(b) => handleHarvestCreated(b)}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrModalVisible}
        batch={activeQrBatch}
        onClose={() => setQrModalVisible(false)}
        onPreviewVerification={(code) => {
          setQrModalVisible(false);
          if (onOpenPublicVerify) onOpenPublicVerify(code);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  scanHeaderBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  errorAlert: {
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
  errorAlertText: {
    fontSize: typography.size.xs,
    color: colors.status.critical.text,
    flex: 1,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  addSmallBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.surface,
  },
  harvestPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentDeep,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  harvestPrimaryBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.surface,
  },
  scanSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  scanSecondaryBtnText: {
    fontSize: typography.size.xs,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCardTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  emptyCardSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.sm,
  },
  emptyActionBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  hivesList: {
    gap: spacing.sm,
  },
  hiveRowCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    ...shadows.card,
  },
  hiveRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  hiveRowName: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  hiveRowSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: 8,
  },
  telemetryMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderLight,
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  sensorConnectionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sensorConnectionText: {
    fontSize: 9.5,
    fontWeight: typography.weight.bold,
  },
  recentHarvestsList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  harvestIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  harvestSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  qrRowBtn: {
    padding: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.sm,
  },
  traceabilityNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  traceabilityNoticeText: {
    fontSize: typography.size.xs,
    color: colors.primary,
    flex: 1,
    lineHeight: 16,
  },
  batchesList: {
    gap: spacing.sm,
  },
  batchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    ...shadows.card,
  },
  batchCardTop: {
    marginBottom: spacing.xs + 2,
  },
  batchCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  batchCodeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  verifiedRegistryPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  verifiedRegistryText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  batchMetaText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  batchActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  batchActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  batchActionBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  batchActionOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  batchActionOutlineText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
    padding: spacing.lg,
  },
  smallModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    ...shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalScrollBody: {
    paddingVertical: spacing.md,
  },
  detailStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'space-around',
  },
  detailStatBox: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  detailStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalFormBody: {
    paddingTop: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm + 2,
  },
  inputLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.status.critical.bg,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  formErrorText: {
    fontSize: typography.size.xs,
    color: colors.error,
  },
});

export default ApiaryPage;
