import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUserHives,
  createHive as createHiveDoc,
  updateHive as updateHiveDoc,
  deleteHive as deleteHiveDoc,
} from '../services/hiveService';
import {
  getUserBatches,
  createBatch as createBatchDoc,
  updateBatch as updateBatchDoc,
  deleteBatch as deleteBatchDoc,
} from '../services/batchService';
import {
  getUserActivities,
  logUserActivity,
} from '../services/activityService';
import {
  addHiveReading as addHiveReadingDoc,
  getRecentHiveReadings,
} from '../services/sensorService';

/**
 * useHiveData Hook
 * Backed entirely by Cloud Firestore for the authenticated user.
 * Zero mock data: unauthenticated users see empty states.
 */
export function useHiveData() {
  const { user } = useAuth();

  const [hives, setHives] = useState([]);
  const [batches, setBatches] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hive filtering state
  const [hiveSearchQuery, setHiveSearchQuery] = useState('');
  const [hiveStatusFilter, setHiveStatusFilter] = useState('all'); // 'all' | 'healthy' | 'attention' | 'critical'
  const [selectedHiveId, setSelectedHiveId] = useState(null);

  // Batch filtering state
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  // Fetch all user-owned data from Firestore
  const loadUserData = useCallback(async () => {
    if (!user?.uid) {
      // Clear data on sign out
      setHives([]);
      setBatches([]);
      setActivities([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [hivesData, batchesData, activitiesData] = await Promise.all([
        getUserHives(user.uid),
        getUserBatches(user.uid),
        getUserActivities(user.uid, 15),
      ]);

      setHives(hivesData);
      setBatches(batchesData);
      setActivities(activitiesData);
    } catch (err) {
      console.error('[useHiveData] Error fetching user data:', err);
      setError(err?.message || 'Failed to load apiary records from Firestore.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load data whenever authenticated user changes
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Aggregated Apiary Statistics computed strictly from real Firestore data
  const stats = useMemo(() => {
    const total = hives.length;
    const healthy = hives.filter((h) => h.status === 'healthy').length;
    const attention = hives.filter((h) => h.status === 'attention').length;
    const critical = hives.filter((h) => h.status === 'critical').length;

    // Real sensor telemetry: calculate averages ONLY from valid measurements
    const hivesWithTemp = hives.filter((h) => typeof h.temperature === 'number');
    const hivesWithHumidity = hives.filter((h) => typeof h.humidity === 'number');

    const avgTemp = hivesWithTemp.length > 0
      ? (hivesWithTemp.reduce((acc, h) => acc + h.temperature, 0) / hivesWithTemp.length).toFixed(1)
      : null; // null represents awaiting sensor connection (not 0.0)

    const avgHumidity = hivesWithHumidity.length > 0
      ? Math.round(hivesWithHumidity.reduce((acc, h) => acc + h.humidity, 0) / hivesWithHumidity.length)
      : null;

    const totalQuantityKg = batches
      .reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
      .toFixed(1);

    return {
      totalHives: total,
      healthyHives: healthy,
      attentionHives: attention,
      criticalHives: critical,
      avgTemperature: avgTemp,
      avgHumidity: avgHumidity,
      totalHarvestedKg: totalQuantityKg,
      activeBatchesCount: batches.length,
      hasSensorReadings: hivesWithTemp.length > 0 || hivesWithHumidity.length > 0,
    };
  }, [hives, batches]);

  // Filtered Hives List
  const filteredHives = useMemo(() => {
    return hives.filter((hive) => {
      const q = hiveSearchQuery.toLowerCase();
      const matchesSearch =
        (hive.id || '').toLowerCase().includes(q) ||
        (hive.name || '').toLowerCase().includes(q) ||
        (hive.location || '').toLowerCase().includes(q) ||
        (hive.yard || '').toLowerCase().includes(q);

      const matchesStatus =
        hiveStatusFilter === 'all' || hive.status === hiveStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [hives, hiveSearchQuery, hiveStatusFilter]);

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const q = batchSearchQuery.toLowerCase();
      return (
        (batch.id || '').toLowerCase().includes(q) ||
        (batch.batchCode || '').toLowerCase().includes(q) ||
        (batch.honeyType || '').toLowerCase().includes(q) ||
        (batch.status || '').toLowerCase().includes(q)
      );
    });
  }, [batches, batchSearchQuery]);

  // Selected Hive Details
  const selectedHive = useMemo(() => {
    return hives.find((h) => h.id === selectedHiveId) || null;
  }, [hives, selectedHiveId]);

  // Selected Batch Details
  const selectedBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // CRUD Actions
  const addHive = async (hiveData) => {
    if (!user?.uid) throw new Error('Must be signed in to create a hive.');
    const created = await createHiveDoc(user.uid, hiveData);
    await logUserActivity(user.uid, {
      action: 'hive_created',
      title: `Hive Registered: ${created.name}`,
      details: `Location: ${created.location}`,
      entityId: created.id,
      entityType: 'hive',
    });
    await loadUserData();
    return created;
  };

  const updateHive = async (hiveId, hiveData) => {
    if (!user?.uid) throw new Error('Must be signed in to update a hive.');
    const updated = await updateHiveDoc(hiveId, user.uid, hiveData);
    await logUserActivity(user.uid, {
      action: 'hive_updated',
      title: `Hive Updated: ${updated.name}`,
      details: `Status: ${updated.status}`,
      entityId: hiveId,
      entityType: 'hive',
    });
    await loadUserData();
    return updated;
  };

  const deleteHive = async (hiveId) => {
    if (!user?.uid) throw new Error('Must be signed in to delete a hive.');
    const linkedBatches = batches.filter((b) => b.hiveId === hiveId);
    if (linkedBatches.length > 0) {
      throw new Error(
        `Cannot delete colony: It is referenced by ${linkedBatches.length} honey batch record(s) (e.g. ${linkedBatches[0].batchCode}). To maintain traceability records, please delete or reassign those batches first.`
      );
    }
    const hiveToDelete = hives.find((h) => h.id === hiveId);
    await deleteHiveDoc(hiveId, user.uid);
    await logUserActivity(user.uid, {
      action: 'hive_deleted',
      title: `Hive Removed: ${hiveToDelete?.name || hiveId}`,
      details: 'Colony record deleted from Firestore',
      entityId: hiveId,
      entityType: 'hive',
    });
    if (selectedHiveId === hiveId) setSelectedHiveId(null);
    await loadUserData();
  };

  const addBatch = async (batchData) => {
    if (!user?.uid) throw new Error('Must be signed in to record a honey batch.');
    const created = await createBatchDoc(user.uid, batchData);
    await logUserActivity(user.uid, {
      action: 'batch_created',
      title: `Harvest Batch Logged: ${created.batchCode}`,
      details: `${created.quantity} kg of ${created.honeyType}`,
      entityId: created.id,
      entityType: 'batch',
    });
    await loadUserData();
    return created;
  };

  const updateBatch = async (batchId, batchData) => {
    if (!user?.uid) throw new Error('Must be signed in to update a batch.');
    const updated = await updateBatchDoc(batchId, user.uid, batchData);
    await logUserActivity(user.uid, {
      action: 'batch_updated',
      title: `Batch Updated: ${updated.batchCode}`,
      details: `Stage: ${updated.status}`,
      entityId: batchId,
      entityType: 'batch',
    });
    await loadUserData();
    return updated;
  };

  const deleteBatch = async (batchId) => {
    if (!user?.uid) throw new Error('Must be signed in to delete a batch.');
    const batchToDelete = batches.find((b) => b.id === batchId);
    await deleteBatchDoc(batchId, user.uid);
    await logUserActivity(user.uid, {
      action: 'batch_deleted',
      title: `Batch Removed: ${batchToDelete?.batchCode || batchId}`,
      details: 'Harvest record deleted from Firestore',
      entityId: batchId,
      entityType: 'batch',
    });
    if (selectedBatchId === batchId) setSelectedBatchId(null);
    await loadUserData();
  };

  const addReading = async (hiveId, readingData) => {
    if (!user?.uid) throw new Error('Must be signed in to record telemetry.');
    const reading = await addHiveReadingDoc(hiveId, user.uid, readingData);
    await logUserActivity(user.uid, {
      action: 'reading_added',
      title: 'Sensor Reading Recorded',
      details: `Source: ${reading.source} (${reading.temperature || '--'}°C)`,
      entityId: hiveId,
      entityType: 'reading',
    });
    await loadUserData();
    return reading;
  };

  return {
    // Datasets
    hives,
    batches,
    activities,
    stats,
    loading,
    error,
    refreshData: loadUserData,

    // Filtered collections
    filteredHives,
    filteredBatches,

    // Hives UI state & controls
    hiveSearchQuery,
    setHiveSearchQuery,
    hiveStatusFilter,
    setHiveStatusFilter,
    selectedHive,
    selectedHiveId,
    setSelectedHiveId,

    // Batches UI state & controls
    batchSearchQuery,
    setBatchSearchQuery,
    selectedBatch,
    selectedBatchId,
    setSelectedBatchId,

    // CRUD methods
    addHive,
    updateHive,
    deleteHive,
    addBatch,
    updateBatch,
    deleteBatch,
    addReading,
  };
}

export default useHiveData;
