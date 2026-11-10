/**
 * Unit Tests for HoneyChain Harvest Suggestions and Maintenance Workflow
 */

const assert = require('assert');

// 1. Replicate Harvest Suggestion Logic
const MIN_HARVEST_WEIGHT_GAIN_KG = 3.5;

function evaluateHarvestSuggestions(hives = [], batches = [], recentReadingsMap = {}) {
  if (!Array.isArray(hives) || hives.length === 0) return [];

  const suggestions = [];

  for (const hive of hives) {
    if (!hive || !hive.id) continue;

    const currentWeight = typeof hive.weight === 'number' ? hive.weight : (typeof hive.latestWeight === 'number' ? hive.latestWeight : null);
    if (currentWeight === null || currentWeight <= 0) continue;

    const readings = recentReadingsMap[hive.id] || [];
    let netGainKg = null;
    let daysObserved = null;

    if (readings.length >= 2) {
      const sorted = [...readings].sort((a, b) => {
        const tA = new Date(a.recordedAt || 0).getTime();
        const tB = new Date(b.recordedAt || 0).getTime();
        return tA - tB;
      });
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      if (typeof first.weight === 'number' && typeof latest.weight === 'number') {
        netGainKg = latest.weight - first.weight;
        const diffMs = new Date(latest.recordedAt).getTime() - new Date(first.recordedAt).getTime();
        daysObserved = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }
    } else if (typeof hive.baselineWeight === 'number' && currentWeight > hive.baselineWeight) {
      netGainKg = currentWeight - hive.baselineWeight;
      daysObserved = 14;
    }

    if (netGainKg !== null && netGainKg >= MIN_HARVEST_WEIGHT_GAIN_KG) {
      const recentHarvest = batches.find((b) => {
        if (b.hiveId !== hive.id) return false;
        const harvestDate = new Date(b.harvestDate || b.createdAt || 0).getTime();
        const daysSince = (Date.now() - harvestDate) / (1000 * 60 * 60 * 24);
        return daysSince < 14;
      });

      if (!recentHarvest) {
        suggestions.push({
          hiveId: hive.id,
          hiveName: hive.name || `Box #${hive.id.slice(0, 6)}`,
          yardLocation: hive.location || hive.yard || 'Apiary Yard',
          currentWeightKg: currentWeight.toFixed(1),
          netGainKg: netGainKg.toFixed(1),
          daysObserved: daysObserved || 14,
          headline: `Inspect Honey Supers on ${hive.name}`,
        });
      }
    }
  }

  return suggestions;
}

// 2. Replicate Maintenance Status Logic
function getHiveMaintenanceStatus(hive, config = { inspectionIntervalDays: 14, cleaningIntervalDays: 30 }) {
  if (!hive) return null;
  const now = Date.now();

  let daysSinceInspection = null;
  let isInspectionDue = false;

  if (hive.lastInspectedAt) {
    const inspectedTime = new Date(hive.lastInspectedAt).getTime();
    if (!isNaN(inspectedTime)) {
      daysSinceInspection = Math.floor((now - inspectedTime) / (1000 * 60 * 60 * 24));
      isInspectionDue = daysSinceInspection >= config.inspectionIntervalDays;
    } else {
      isInspectionDue = true;
    }
  } else {
    isInspectionDue = true;
  }

  let daysSinceCleaning = null;
  let isCleaningDue = false;

  if (hive.lastCleanedAt) {
    const cleanedTime = new Date(hive.lastCleanedAt).getTime();
    if (!isNaN(cleanedTime)) {
      daysSinceCleaning = Math.floor((now - cleanedTime) / (1000 * 60 * 60 * 24));
      isCleaningDue = daysSinceCleaning >= config.cleaningIntervalDays;
    } else {
      isCleaningDue = true;
    }
  } else {
    isCleaningDue = true;
  }

  return {
    hiveId: hive.id,
    isInspectionDue,
    daysSinceInspection,
    isCleaningDue,
    daysSinceCleaning,
  };
}

function runTests() {
  console.log('======================================================');
  console.log('🍯 HoneyChain Harvest Suggestions & Maintenance Tests');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`▶ TEST: ${name.padEnd(65)} ✅ PASS`);
      passed++;
    } catch (e) {
      console.error(`▶ TEST: ${name.padEnd(65)} ❌ FAIL: ${e.message}`);
      failed++;
    }
  }

  // Harvest Suggestion Tests
  test('Identifies harvest suggestion when weight gain >= 3.5 kg', () => {
    const hives = [{ id: 'hive_1', name: 'Cauvery Box 01', weight: 24.5, location: 'Yard North' }];
    const readingsMap = {
      hive_1: [
        { weight: 20.0, recordedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
        { weight: 24.5, recordedAt: new Date().toISOString() },
      ],
    };
    const suggs = evaluateHarvestSuggestions(hives, [], readingsMap);
    assert.strictEqual(suggs.length, 1);
    assert.strictEqual(suggs[0].hiveName, 'Cauvery Box 01');
    assert.strictEqual(suggs[0].netGainKg, '4.5');
  });

  test('Suppresses harvest suggestion if gain is < 3.5 kg', () => {
    const hives = [{ id: 'hive_2', name: 'Box 02', weight: 21.0 }];
    const readingsMap = {
      hive_2: [
        { weight: 20.0, recordedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
        { weight: 21.0, recordedAt: new Date().toISOString() },
      ],
    };
    const suggs = evaluateHarvestSuggestions(hives, [], readingsMap);
    assert.strictEqual(suggs.length, 0);
  });

  test('Suppresses harvest suggestion if colony was already harvested recently (<14d)', () => {
    const hives = [{ id: 'hive_3', name: 'Box 03', weight: 28.0 }];
    const readingsMap = {
      hive_3: [
        { weight: 20.0, recordedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
        { weight: 28.0, recordedAt: new Date().toISOString() },
      ],
    };
    const recentBatches = [
      { id: 'batch_1', hiveId: 'hive_3', harvestDate: new Date(Date.now() - 3 * 86400000).toISOString() },
    ];
    const suggs = evaluateHarvestSuggestions(hives, recentBatches, readingsMap);
    assert.strictEqual(suggs.length, 0);
  });

  // Maintenance Status Tests
  test('New hive with no recorded inspection marks isInspectionDue: true', () => {
    const hive = { id: 'hive_new', name: 'New Colony' };
    const status = getHiveMaintenanceStatus(hive);
    assert.strictEqual(status.isInspectionDue, true);
    assert.strictEqual(status.daysSinceInspection, null);
  });

  test('Hive inspected 5 days ago is NOT due (14-day threshold)', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    const hive = { id: 'hive_recent', name: 'Active Colony', lastInspectedAt: fiveDaysAgo };
    const status = getHiveMaintenanceStatus(hive);
    assert.strictEqual(status.isInspectionDue, false);
    assert.strictEqual(status.daysSinceInspection, 5);
  });

  test('Hive inspected 16 days ago IS due', () => {
    const sixteenDaysAgo = new Date(Date.now() - 16 * 86400000).toISOString();
    const hive = { id: 'hive_overdue', name: 'Overdue Colony', lastInspectedAt: sixteenDaysAgo };
    const status = getHiveMaintenanceStatus(hive);
    assert.strictEqual(status.isInspectionDue, true);
    assert.strictEqual(status.daysSinceInspection, 16);
  });

  test('Configurable maintenance intervals work as expected (e.g. 7 days)', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    const hive = { id: 'hive_cfg', name: 'Custom Colony', lastInspectedAt: tenDaysAgo };
    const customConfig = { inspectionIntervalDays: 7, cleaningIntervalDays: 14 };
    const status = getHiveMaintenanceStatus(hive, customConfig);
    assert.strictEqual(status.isInspectionDue, true);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();

