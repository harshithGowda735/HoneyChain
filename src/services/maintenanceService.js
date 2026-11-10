import { updateHiveDoc } from './hiveService';
import { sendPhoneNotification } from './deviceNotificationService';

export const DEFAULT_MAINTENANCE_CONFIG = {
  inspectionIntervalDays: 14, // Standard 2-week active apiculture inspection cycle
  cleaningIntervalDays: 30,    // Standard monthly bottom board & propolis scrape cycle
};

/**
 * Standard Beekeeping Inspection & Cleaning Checklist Items
 */
export const INSPECTION_CHECKLIST_ITEMS = [
  { key: 'queenSpotted', label: 'Queen spotted or fresh worker eggs present' },
  { key: 'broodPattern', label: 'Solid, healthy brood pattern without foulbrood signs' },
  { key: 'foodStores', label: 'Adequate capped honey and pollen reserves' },
  { key: 'pestCheck', label: 'Varroa mite, wax moth, and small hive beetle check clear' },
  { key: 'bottomBoard', label: 'Bottom board debris cleared & entrance reducer adjusted' },
];

/**
 * Evaluates whether inspection or cleaning is currently due for a hive.
 *
 * @param {object} hive - Hive record
 * @param {object} [config] - Configurable interval overrides
 */
export function getHiveMaintenanceStatus(hive, config = DEFAULT_MAINTENANCE_CONFIG) {
  if (!hive) return null;

  const cfg = { ...DEFAULT_MAINTENANCE_CONFIG, ...config };
  const now = Date.now();

  // 1. Evaluate Inspection Status
  let daysSinceInspection = null;
  let isInspectionDue = false;

  if (hive.lastInspectedAt) {
    const inspectedTime = new Date(hive.lastInspectedAt).getTime();
    if (!isNaN(inspectedTime)) {
      daysSinceInspection = Math.floor((now - inspectedTime) / (1000 * 60 * 60 * 24));
      isInspectionDue = daysSinceInspection >= cfg.inspectionIntervalDays;
    } else {
      isInspectionDue = true;
    }
  } else {
    // Never inspected
    isInspectionDue = true;
  }

  // 2. Evaluate Cleaning Status
  let daysSinceCleaning = null;
  let isCleaningDue = false;

  if (hive.lastCleanedAt) {
    const cleanedTime = new Date(hive.lastCleanedAt).getTime();
    if (!isNaN(cleanedTime)) {
      daysSinceCleaning = Math.floor((now - cleanedTime) / (1000 * 60 * 60 * 24));
      isCleaningDue = daysSinceCleaning >= cfg.cleaningIntervalDays;
    } else {
      isCleaningDue = true;
    }
  } else {
    // Never cleaned
    isCleaningDue = true;
  }

  return {
    hiveId: hive.id,
    hiveName: hive.name || 'Colony',
    isInspectionDue,
    daysSinceInspection,
    nextInspectionDueIn: daysSinceInspection !== null ? cfg.inspectionIntervalDays - daysSinceInspection : 0,
    isCleaningDue,
    daysSinceCleaning,
    nextCleaningDueIn: daysSinceCleaning !== null ? cfg.cleaningIntervalDays - daysSinceCleaning : 0,
    lastInspectedAt: hive.lastInspectedAt || null,
    lastCleanedAt: hive.lastCleanedAt || null,
    lastNotes: hive.lastMaintenanceNotes || '',
  };
}

/**
 * Records an inspection or cleaning task for a hive.
 * Persists directly into the existing hive document.
 */
export async function saveHiveMaintenance(hiveId, uid, maintenanceData, updateHiveFn) {
  if (!hiveId || !uid) throw new Error('Hive ID and User ID are required.');

  const nowIso = new Date().toISOString();
  const updates = {
    updatedAt: nowIso,
  };

  const isInspection = maintenanceData.type === 'inspection' || maintenanceData.type === 'both';
  const isCleaning = maintenanceData.type === 'cleaning' || maintenanceData.type === 'both';

  if (isInspection) {
    updates.lastInspectedAt = nowIso;
  }
  if (isCleaning) {
    updates.lastCleanedAt = nowIso;
  }
  if (maintenanceData.notes) {
    updates.lastMaintenanceNotes = maintenanceData.notes.trim();
  }
  if (maintenanceData.checklist) {
    updates.lastMaintenanceChecklist = maintenanceData.checklist;
  }

  // Use provided update function or fallback
  let updated;
  if (updateHiveFn) {
    updated = await updateHiveFn(hiveId, updates);
  } else {
    updated = await updateHiveDoc(hiveId, uid, updates);
  }

  // Trigger confirmation phone notification
  const actionLabel = isInspection && isCleaning ? 'Inspection & Cleaning' : (isInspection ? 'Inspection' : 'Cleaning');
  sendPhoneNotification({
    title: `📋 ${actionLabel} Completed`,
    body: `${maintenanceData.hiveName || 'Hive Box'}: Routine maintenance logged. Next inspection due in 14 days.`,
    channelId: 'colony_alerts',
    data: { hiveId, type: 'maintenance_completed' },
  });

  return updated;
}

export default {
  DEFAULT_MAINTENANCE_CONFIG,
  INSPECTION_CHECKLIST_ITEMS,
  getHiveMaintenanceStatus,
  saveHiveMaintenance,
};

