import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUserHives,
  subscribeUserHives,
  getLocalHives,
  createHive as createHiveDoc,
  updateHive as updateHiveDoc,
  deleteHive as deleteHiveDoc,
} from '../services/hiveService';
import {
  getUserBatches,
  getLocalBatches,
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

  // Real-time Firestore subscription + local hydration lifecycle
  useEffect(() => {
    let isMounted = true;

    if (!user?.uid) {
      setHives([]);
      setBatches([]);
      setActivities([]);
      setLoading(false);
      setError(null);
      return;
    }

    // 1. Instant local hydration (0ms - prevents UI stutter)
    Promise.all([
      getLocalHives(user.uid),
      getLocalBatches(user.uid),
    ]).then(([localH, localB]) => {
      if (!isMounted) return;
      if ((localH && localH.length > 0) || (localB && localB.length > 0)) {
        if (localH) setHives(localH);
        if (localB) setBatches(localB);
        setLoading(false);
      } else {
        setLoading(true);
      }
    });

    // 2. Fetch one-time secondary collections (batches & activities)
    Promise.all([
      getUserBatches(user.uid),
      getUserActivities(user.uid, 15),
    ])
      .then(([batchesData, activitiesData]) => {
        if (!isMounted) return;
        if (batchesData && batchesData.length > 0) setBatches(batchesData);
        setActivities(activitiesData || []);
      })
      .catch((err) => {
        console.log('[useHiveData] Batches/Activities background sync notice:', err?.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 3. Attach real-time Firestore onSnapshot listener for Hives
    // This ensures hardware readings ingested into parent documents update the dashboard automatically.
    const unsubscribeHives = subscribeUserHives(
      user.uid,
      (freshHives) => {
        if (!isMounted) return;
        setHives(freshHives);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!isMounted) return;
        console.log('[useHiveData] Real-time hives listener error:', err?.message);
        setError('Real-time connection interrupted. Using local cache.');
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubscribeHives === 'function') {
        unsubscribeHives();
      }
    };
  }, [user?.uid]);

  // Manual pull-to-refresh handler
  const refreshData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [freshHives, freshBatches, freshActivities] = await Promise.all([
        getUserHives(user.uid),
        getUserBatches(user.uid),
        getUserActivities(user.uid, 15),
      ]);
      if (freshHives) setHives(freshHives);
      if (freshBatches) setBatches(freshBatches);
      if (freshActivities) setActivities(freshActivities);
    } catch (err) {
      console.log('[useHiveData] Manual refresh notice:', err?.message);
    }
  }, [user?.uid]);

  // Aggregated Apiary Statistics computed strictly from real Firestore data
  const stats = useMemo(() => {
    const total = hives.length;
    const healthy = hives.filter((h) => h.status === 'healthy').length;
    const attention = hives.filter((h) => h.status === 'attention').length;
    const critical = hives.filter((h) => h.status === 'critical').length;

    // Real sensor telemetry: calculate averages ONLY from valid measurements
    const hivesWithTemp = hives.filter((h) => typeof h.temperature === 'number');
    const hivesWithHumidity = hives.filter((h) => typeof h.humidity === 'number');
    const hivesWithWeight = hives.filter(
      (h) => (typeof h.weight === 'number' && h.weight > 0) || (typeof h.latestWeight === 'number' && h.latestWeight > 0)
    );

    const avgTemp = hivesWithTemp.length > 0
      ? (hivesWithTemp.reduce((acc, h) => acc + h.temperature, 0) / hivesWithTemp.length).toFixed(1)
      : null; // null represents awaiting sensor connection (not 0.0)

    const avgHumidity = hivesWithHumidity.length > 0
      ? Math.round(hivesWithHumidity.reduce((acc, h) => acc + h.humidity, 0) / hivesWithHumidity.length)
      : null;

    const avgWeight = hivesWithWeight.length > 0
      ? (
          hivesWithWeight.reduce((acc, h) => acc + (h.weight ?? h.latestWeight), 0) /
          hivesWithWeight.length
        ).toFixed(1)
      : null;

    const totalQuantityKg = batches
      .reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
      .toFixed(1);

    // Evaluate hardware freshness: <24h is live, >24h is stale
    const pairedHives = hives.filter((h) => Boolean(h.sensorDeviceId || h.deviceId));
    const now = Date.now();
    let hasLiveReading = false;
    let hasStaleReading = false;

    pairedHives.forEach((h) => {
      let rTime = null;
      if (h.lastReadingAt?.toMillis) {
        rTime = h.lastReadingAt.toMillis();
      } else if (h.lastReadingAt?.seconds) {
        rTime = h.lastReadingAt.seconds * 1000;
      } else if (h.lastReadingAt) {
        rTime = new Date(h.lastReadingAt).getTime();
      } else if (h.updatedAt?.toMillis) {
        rTime = h.updatedAt.toMillis();
      } else if (h.updatedAt?.seconds) {
        rTime = h.updatedAt.seconds * 1000;
      } else if (h.updatedAt) {
        rTime = new Date(h.updatedAt).getTime();
      }

      if (rTime && !isNaN(rTime) && (typeof h.weight === 'number' || typeof h.temperature === 'number')) {
        const ageHours = (now - rTime) / (1000 * 60 * 60);
        if (ageHours <= 24) {
          hasLiveReading = true;
        } else {
          hasStaleReading = true;
        }
      }
    });

    let telemetryStatus = 'no_sensor'; // 'live' | 'stale' | 'awaiting_first_ping' | 'no_sensor'
    if (hasLiveReading) {
      telemetryStatus = 'live';
    } else if (hasStaleReading) {
      telemetryStatus = 'stale';
    } else if (pairedHives.length > 0) {
      telemetryStatus = 'awaiting_first_ping';
    }

    return {
      totalHives: total,
      healthyHives: healthy,
      attentionHives: attention,
      criticalHives: critical,
      avgTemperature: avgTemp,
      avgHumidity: avgHumidity,
      avgWeight: avgWeight,
      totalHarvestedKg: totalQuantityKg,
      activeBatchesCount: batches.length,
      hasSensorReadings: hivesWithTemp.length > 0 || hivesWithHumidity.length > 0 || hivesWithWeight.length > 0,
      hasWeightReadings: hivesWithWeight.length > 0,
      telemetryStatus,
      pairedSensorsCount: pairedHives.length,
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

  // CRUD Actions with instant optimistic state update (0ms delay)
  const addHive = async (hiveData) => {
    if (!user?.uid) throw new Error('Must be signed in to create a hive.');
    const created = await createHiveDoc(user.uid, hiveData);
    logUserActivity(user.uid, {
      action: 'hive_created',
      title: `Hive Registered: ${created.name}`,
      details: `Location: ${created.location}`,
      entityId: created.id,
      entityType: 'hive',
    });
    setHives((prev) => [created, ...prev.filter((h) => h.id !== created.id)]);
    return created;
  };

  const updateHive = async (hiveId, hiveData) => {
    if (!user?.uid) throw new Error('Must be signed in to update a hive.');
    const updated = await updateHiveDoc(hiveId, user.uid, hiveData);
    logUserActivity(user.uid, {
      action: 'hive_updated',
      title: `Hive Updated: ${updated.name}`,
      details: `Status: ${updated.status}`,
      entityId: hiveId,
      entityType: 'hive',
    });
    setHives((prev) => prev.map((h) => (h.id === hiveId ? { ...h, ...updated } : h)));
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
    logUserActivity(user.uid, {
      action: 'hive_deleted',
      title: `Hive Removed: ${hiveToDelete?.name || hiveId}`,
      details: 'Colony record deleted from Firestore',
      entityId: hiveId,
      entityType: 'hive',
    });
    setHives((prev) => prev.filter((h) => h.id !== hiveId));
    if (selectedHiveId === hiveId) setSelectedHiveId(null);
  };

  const addBatch = async (batchData) => {
    if (!user?.uid) throw new Error('Must be signed in to record a honey batch.');
    const created = await createBatchDoc(user.uid, batchData);
    logUserActivity(user.uid, {
      action: 'batch_created',
      title: `Harvest Batch Logged: ${created.batchCode}`,
      details: `${created.quantity} kg of ${created.honeyType}`,
      entityId: created.id,
      entityType: 'batch',
    });
    setBatches((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
    return created;
  };

  const updateBatch = async (batchId, batchData) => {
    if (!user?.uid) throw new Error('Must be signed in to update a batch.');
    const updated = await updateBatchDoc(batchId, user.uid, batchData);
    logUserActivity(user.uid, {
      action: 'batch_updated',
      title: `Batch Updated: ${updated.batchCode}`,
      details: `Stage: ${updated.status}`,
      entityId: batchId,
      entityType: 'batch',
    });
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, ...updated } : b)));
    return updated;
  };

  const deleteBatch = async (batchId) => {
    if (!user?.uid) throw new Error('Must be signed in to delete a batch.');
    const batchToDelete = batches.find((b) => b.id === batchId);
    await deleteBatchDoc(batchId, user.uid);
    logUserActivity(user.uid, {
      action: 'batch_deleted',
      title: `Batch Removed: ${batchToDelete?.batchCode || batchId}`,
      details: 'Harvest record deleted from Firestore',
      entityId: batchId,
      entityType: 'batch',
    });
    setBatches((prev) => prev.filter((b) => b.id !== batchId));
    if (selectedBatchId === batchId) setSelectedBatchId(null);
  };

  const addReading = async (hiveId, readingData) => {
    if (!user?.uid) throw new Error('Must be signed in to record telemetry.');
    const reading = await addHiveReadingDoc(hiveId, user.uid, readingData);
    logUserActivity(user.uid, {
      action: 'reading_added',
      title: 'Sensor Reading Recorded',
      details: `Source: ${reading.source} (${reading.temperature || '--'}°C)`,
      entityId: hiveId,
      entityType: 'reading',
    });
    setHives((prev) =>
      prev.map((h) =>
        h.id === hiveId
          ? {
              ...h,
              temperature: reading.temperature ?? h.temperature,
              humidity: reading.humidity ?? h.humidity,
              weight: reading.weight ?? h.weight,
            }
          : h
      )
    );
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
