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
import HiveCard from '../components/hives/HiveCard';
import HiveWeightTrendChart from '../components/telemetry/HiveWeightTrendChart';
import HiveMaintenanceModal from '../components/hives/HiveMaintenanceModal';
import RecordHarvestModal from '../components/batches/RecordHarvestModal';
import QRCodeModal from '../components/batches/QRCodeModal';
import { formatDate } from '../utils/formatDate';
import {
  determineSensorConnectionStatus,
  getRecentHiveReadings,
} from '../services/sensorService';
import { saveHiveMaintenance, getHiveMaintenanceStatus } from '../services/maintenanceService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BeehiveIllustration } from '../components/illustrations/BeehiveIllustration';
import { EmptyApiaryIllustration } from '../components/illustrations/EmptyApiaryIllustration';
import { HoneyJarIllustration } from '../components/illustrations/HoneyJarIllustration';
import { HoneycombPattern } from '../components/illustrations/HoneycombPattern';

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

  // Active Tab within Apiary: 'colonies' | 'harvests'
  const [activeSubTab, setActiveSubTab] = useState('colonies');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [addReadingModalVisible, setAddReadingModalVisible] = useState(false);
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);

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

  // Filtered Hives based on search query
  const filteredHives = useMemo(() => {
    if (!searchQuery.trim()) return hives;
    const q = searchQuery.toLowerCase().trim();
    return hives.filter(
      (h) =>
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.location && h.location.toLowerCase().includes(q)) ||
        (h.id && h.id.toLowerCase().includes(q))
    );
  }, [hives, searchQuery]);

  // Filtered Batches based on search query
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const q = searchQuery.toLowerCase().trim();
    return batches.filter(
      (b) =>
        (b.honeyType && b.honeyType.toLowerCase().includes(q)) ||
        (b.batchCode && b.batchCode.toLowerCase().includes(q)) ||
        (b.hiveName && b.hiveName.toLowerCase().includes(q))
    );
  }, [batches, searchQuery]);

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

  const handleSaveMaintenance = async (hiveId, maintenanceData) => {
    try {
      await saveHiveMaintenance(hiveId, user?.uid, maintenanceData, onUpdateHive);
      if (selectedHive && selectedHive.id === hiveId) {
        setSelectedHive((prev) => ({
          ...prev,
          lastInspectedAt: maintenanceData.type !== 'cleaning' ? new Date().toISOString() : prev.lastInspectedAt,
          lastCleanedAt: maintenanceData.type !== 'inspection' ? new Date().toISOString() : prev.lastCleanedAt,
          lastMaintenanceNotes: maintenanceData.notes || prev.lastMaintenanceNotes,
        }));
      }
      Alert.alert('Success', 'Inspection and maintenance logged successfully.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save maintenance.');
    }
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

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.primaryDark}
            colors={[colors.primaryDark]}
          />
        }
      >
        {/* Top Header Card */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>{t('tabApiary', 'My Apiary')}</Text>
              <Text style={styles.screenSubtitle}>
                {hives.length} Colonies • {batches.length} Certified Batches
              </Text>
            </View>

            {onOpenScanner && (
              <TouchableOpacity
                onPress={onOpenScanner}
                style={styles.scanHeaderBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="qr-code-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.scanHeaderBtnText}>Scan Jar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sub-Tabs: Colonies vs Honey Harvests */}
          <View style={styles.tabPillContainer}>
            <TouchableOpacity
              style={[styles.tabPill, activeSubTab === 'colonies' && styles.tabPillActive]}
              onPress={() => setActiveSubTab('colonies')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cube"
                size={15}
                color={activeSubTab === 'colonies' ? colors.primaryDark : colors.textSecondary}
              />
              <Text style={[styles.tabPillText, activeSubTab === 'colonies' && styles.tabPillTextActive]}>
                Colonies ({hives.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabPill, activeSubTab === 'harvests' && styles.tabPillActive]}
              onPress={() => setActiveSubTab('harvests')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="leaf"
                size={15}
                color={activeSubTab === 'harvests' ? colors.primaryDark : colors.textSecondary}
              />
              <Text style={[styles.tabPillText, activeSubTab === 'harvests' && styles.tabPillTextActive]}>
                Harvests ({batches.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Global Error Banner */}
        {error ? (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.status.critical.text} />
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        ) : null}

        {/* =========================================================================
            TAB 1: COLONIES
           ========================================================================= */}
        {activeSubTab === 'colonies' && (
          <View style={styles.tabContent}>
            {/* Search & Add Action Bar */}
            <View style={styles.actionBarRow}>
              <View style={styles.searchBarWrap}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('searchHivesPlaceholder', 'Search colonies...')}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleOpenAddHive()}
                style={styles.addColonyBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addColonyBtnText}>Add Colony</Text>
              </TouchableOpacity>
            </View>

            {/* Empty State with Hand-Drawn Illustration */}
            {filteredHives.length === 0 && !loading ? (
              <EmptyState
                illustration={<EmptyApiaryIllustration size={140} />}
                title={searchQuery ? 'No matching colonies' : t('noHivesFound', 'No colonies registered yet')}
                description={
                  searchQuery
                    ? 'Try adjusting your search terms.'
                    : 'Register your first hive colony to track weights, brood temperatures, and harvests.'
                }
                actionTitle={searchQuery ? 'Clear Search' : 'Register First Hive'}
                onActionPress={() => (searchQuery ? setSearchQuery('') : handleOpenAddHive())}
              />
            ) : (
              <View style={styles.hivesList}>
                {filteredHives.map((hive) => (
                  <HiveCard
                    key={hive.id}
                    hive={hive}
                    onPress={() => setSelectedHive(hive)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 2: HONEY HARVESTS & BATCHES
           ========================================================================= */}
        {activeSubTab === 'harvests' && (
          <View style={styles.tabContent}>
            {/* Action Bar */}
            <View style={styles.harvestActionBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.harvestSectionTitle}>Extracted Honey Batches</Text>
                <Text style={styles.harvestSectionSub}>Source-verified lots with QR codes</Text>
              </View>

              <AppButton
                title={t('recordHarvestBtn', 'Log Harvest')}
                iconName="add"
                variant="primary"
                size="sm"
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
              />
            </View>

            {filteredBatches.length === 0 && !loading ? (
              <EmptyState
                illustration={<HoneyJarIllustration size={100} />}
                title={t('noBatchesFound', 'No honey batches recorded yet')}
                description={t('noBatchesDesc', 'Tap "Log Harvest" to create your first traceable honey lot.')}
                actionTitle="Log Harvest"
                onActionPress={() => {
                  if (hives.length === 0) {
                    handleOpenAddHive();
                  } else {
                    setRecordHarvestVisible(true);
                  }
                }}
              />
            ) : (
              <View style={styles.batchesList}>
                {filteredBatches.map((batch) => {
                  const batchCode = batch.batchCode || batch.id;
                  return (
                    <AppCard key={batch.id} elevation="card" style={styles.batchCard}>
                      <View style={styles.batchTopRow}>
                        <View style={styles.batchJarWrap}>
                          <Ionicons name="leaf" size={18} color={colors.primaryDark} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.batchCodeRow}>
                            <Text style={styles.batchCodeText}>{batchCode}</Text>
                            <StatusBadge status={batch.stage || 'Completed'} size="sm" />
                          </View>
                          <Text style={styles.batchHoneyType}>
                            {batch.honeyType || 'Multifloral Raw Honey'} • {batch.quantity || 0} kg
                          </Text>
                          <Text style={styles.batchDateText}>
                            Extracted {formatDate(batch.harvestDate)} • Colony: {batch.hiveName || 'Apiary'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.batchActionsRow}>
                        <TouchableOpacity
                          style={styles.batchActionBtn}
                          onPress={() => {
                            setActiveQrBatch(batch);
                            setQrModalVisible(true);
                          }}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="qr-code-outline" size={15} color={colors.primaryDark} />
                          <Text style={styles.batchActionBtnText}>View QR Code</Text>
                        </TouchableOpacity>

                        {onOpenPublicVerify && (
                          <TouchableOpacity
                            style={styles.batchVerifyBtn}
                            onPress={() => onOpenPublicVerify(batchCode)}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="checkmark-seal-outline" size={15} color={colors.sage} />
                            <Text style={styles.batchVerifyBtnText}>Verify Certificate</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </AppCard>
                  );
                })}
              </View>
            )}
          </View>
        )}
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
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <BeehiveIllustration size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedHive.name}</Text>
                      <Text style={styles.modalSubtitle}>
                        {selectedHive.location || 'Apiary Yard'} • {selectedHive.queenStatus || 'Queen Active'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedHive(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
                  {/* Four Core Metric Chips */}
                  <View style={styles.detailStatsRow}>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatValue}>{selectedHive.framesCount || 10}</Text>
                      <Text style={styles.detailStatLabel}>Frames</Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatValue}>{selectedHive.honeySuperCount || 1}</Text>
                      <Text style={styles.detailStatLabel}>Supers</Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={[styles.detailStatValue, { color: colors.primaryDark }]}>
                        {typeof selectedHive.temperature === 'number' ? `${selectedHive.temperature}°C` : '--'}
                      </Text>
                      <Text style={styles.detailStatLabel}>Brood Temp</Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={[styles.detailStatValue, { color: colors.sensor.humidity }]}>
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

                  {/* Maintenance & Inspection Status */}
                  <View style={styles.maintenanceDetailBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.maintenanceDetailTitle}>
                        Bi-Weekly Inspection
                      </Text>
                      <Text style={styles.maintenanceDetailSub}>
                        Last inspected: {selectedHive.lastInspectedAt ? formatDate(selectedHive.lastInspectedAt) : 'None recorded'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.logChecklistBtn}
                      onPress={() => setMaintenanceModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="clipboard-outline" size={14} color={colors.primaryDark} />
                      <Text style={styles.logChecklistBtnText}>Log Inspection</Text>
                    </TouchableOpacity>
                  </View>

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
                      title="Edit Colony"
                      iconName="create-outline"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        const hiveToEdit = selectedHive;
                        handleOpenAddHive(hiveToEdit);
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>

                  {/* Delete Colony Button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteHive(selectedHive.id)}
                    style={styles.deleteHiveBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.error} />
                    <Text style={styles.deleteHiveText}>Delete Colony Record</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          ADD / EDIT COLONY MODAL
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
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingHiveId ? 'Edit Colony' : 'Register New Colony'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Apiary hive box details and specifications
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddHiveModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollBody}>
              {hiveFormError ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorAlertText}>{hiveFormError}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Colony Name / Box Label *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Hive A1, Cauvery Queen Box"
                  placeholderTextColor={colors.textMuted}
                  value={formHiveName}
                  onChangeText={setFormHiveName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Yard or Apiary Location *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. South Orchard, Stand #4"
                  placeholderTextColor={colors.textMuted}
                  value={formHiveLocation}
                  onChangeText={setFormHiveLocation}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Total Frames</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={formFramesCount}
                    onChangeText={setFormFramesCount}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Honey Supers</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={formSupersCount}
                    onChangeText={setFormSupersCount}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Queen Status</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Marked - Active, Virgin, Supersedure"
                  placeholderTextColor={colors.textMuted}
                  value={formQueenStatus}
                  onChangeText={setFormQueenStatus}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Scale / ESP32 Device ID (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. HC-ESP32-0042"
                  placeholderTextColor={colors.textMuted}
                  value={formDeviceId}
                  onChangeText={setFormDeviceId}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Colony temperament, comb condition, pollen stores..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={formNotes}
                  onChangeText={setFormNotes}
                />
              </View>

              <AppButton
                title={isSubmittingHive ? 'Saving Colony...' : 'Save Colony Record'}
                variant="primary"
                size="lg"
                loading={isSubmittingHive}
                onPress={handleSaveHive}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MANUAL SCALE / SENSOR READING MODAL
         ========================================================================= */}
      <Modal
        visible={addReadingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddReadingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Record Manual Measurement</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedHive?.name} • Weight scale or manual inspection reading
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddReadingModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Colony Scale Weight (kg) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 28.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={readingWeight}
                  onChangeText={setReadingWeight}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Brood Temp (°C)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 34.8"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={readingTemp}
                    onChangeText={setReadingTemp}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Humidity (%)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 58"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={readingHumidity}
                    onChangeText={setReadingHumidity}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Observation Notes</Text>
                <TextInput
                  style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Weather conditions, honey super filling..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={readingNotes}
                  onChangeText={setReadingNotes}
                />
              </View>

              <AppButton
                title={isSubmittingReading ? 'Saving...' : 'Save Measurement'}
                variant="primary"
                size="lg"
                loading={isSubmittingReading}
                onPress={handleSaveReading}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Record Harvest Modal */}
      <RecordHarvestModal
        visible={recordHarvestVisible}
        hives={hives}
        onClose={() => setRecordHarvestVisible(false)}
        onSubmitHarvest={async (harvestPayload) => {
          if (onAddBatch) {
            const created = await onAddBatch(harvestPayload);
            if (created) {
              setActiveQrBatch(created);
              setQrModalVisible(true);
            }
          }
        }}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrModalVisible}
        batch={activeQrBatch}
        onClose={() => {
          setQrModalVisible(false);
          setActiveQrBatch(null);
        }}
        onPreviewVerification={(code) => {
          setQrModalVisible(false);
          if (onOpenPublicVerify) onOpenPublicVerify(code);
        }}
      />

      {/* Hive Maintenance Modal */}
      {selectedHive && (
        <HiveMaintenanceModal
          visible={maintenanceModalVisible}
          hive={selectedHive}
          onClose={() => setMaintenanceModalVisible(false)}
          onSaveMaintenance={handleSaveMaintenance}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + 32,
  },
  topHeader: {
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  scanHeaderBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  tabPillContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softAmber,
    ...shadows.sm,
  },
  tabPillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  tabPillTextActive: {
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  tabContent: {
    marginTop: spacing.xs,
  },
  actionBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.xs + 1,
    color: colors.textPrimary,
  },
  addColonyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: 4,
    ...shadows.sm,
  },
  addColonyBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: '#FFFFFF',
  },
  hivesList: {
    gap: spacing.xs,
  },
  harvestActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  harvestSectionTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  harvestSectionSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  batchesList: {
    gap: spacing.xs,
  },
  batchCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  batchTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  batchJarWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softAmber,
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
  batchHoneyType: {
    fontSize: typography.size.xs + 1,
    color: colors.primaryDark,
    fontWeight: typography.weight.semibold,
  },
  batchDateText: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  batchActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  batchActionBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  batchVerifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.sageLight,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  batchVerifyBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.sageDark,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(73, 61, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '92%',
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: typography.size.lg + 1,
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalScrollBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailStatBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.sm,
  },
  detailStatValue: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  detailStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  maintenanceDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  maintenanceDetailTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  maintenanceDetailSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logChecklistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  logChecklistBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  deleteHiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  deleteHiveText: {
    fontSize: typography.size.xs,
    color: colors.error,
    fontWeight: typography.weight.semibold,
  },
  formScrollBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formLabel: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
});

export default ApiaryPage;
