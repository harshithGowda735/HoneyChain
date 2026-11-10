import { sendPhoneNotification } from './deviceNotificationService';

/**
 * HoneyChain Harvest Suggestion Engine
 *
 * Apiculture Rule:
 * Weight accumulation indicates nectar flow and honey storage.
 * However, WEIGHT ALONE DOES NOT PROVE HONEY IS RIPE.
 * Honey must be properly ripened and capped by bees (>80% capped cells)
 * to achieve acceptable moisture levels (<20%).
 *
 * Therefore, this service issues conservative *COMB INSPECTION RECOMMENDATIONS*,
 * identifying the exact hive box, its observed gain, and recommending physical inspection.
 */

export const MIN_HARVEST_WEIGHT_GAIN_KG = 3.5; // Minimum gain suggesting honey super filling

/**
 * Evaluates whether any hive box warrants a physical comb inspection for harvest readiness.
 *
 * @param {Array} hives - User hive list
 * @param {Array} batches - User batch list (to check recent extractions)
 * @param {object} [recentReadingsMap] - Optional map of hiveId -> readings array
 * @returns {Array<object>} Harvest inspection suggestions
 */
export function evaluateHarvestSuggestions(hives = [], batches = [], recentReadingsMap = {}) {
  if (!Array.isArray(hives) || hives.length === 0) return [];

  const suggestions = [];

  for (const hive of hives) {
    if (!hive || !hive.id) continue;

    const currentWeight = typeof hive.weight === 'number' ? hive.weight : (typeof hive.latestWeight === 'number' ? hive.latestWeight : null);
    if (currentWeight === null || currentWeight <= 0) continue;

    // 1. Check readings history for net gain
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

    // 2. Check if net gain exceeds threshold (e.g. +3.5 kg or more)
    if (netGainKg !== null && netGainKg >= MIN_HARVEST_WEIGHT_GAIN_KG) {
      // 3. Check if already extracted recently (within last 14 days)
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
          recommendation: `Colony weight increased by +${netGainKg.toFixed(1)} kg over ${daysObserved || 14} days. Nectar accumulation detected.`,
          caution: 'Verify physical frames before harvesting: Ensure combs are at least 80% capped to guarantee safe moisture content (<20%).',
        });
      }
    }
  }

  return suggestions;
}

/**
 * Dispatches a native phone notification for newly identified harvest inspection suggestions.
 */
export async function notifyHarvestSuggestion(suggestion) {
  if (!suggestion) return;

  await sendPhoneNotification({
    title: `🍯 Harvest Inspection: ${suggestion.hiveName}`,
    body: `${suggestion.hiveName} (${suggestion.yardLocation}) gained +${suggestion.netGainKg} kg. Perform comb inspection before harvesting.`,
    channelId: 'harvest_suggestions',
    data: { hiveId: suggestion.hiveId, type: 'harvest_suggestion' },
  });
}

export default {
  MIN_HARVEST_WEIGHT_GAIN_KG,
  evaluateHarvestSuggestions,
  notifyHarvestSuggestion,
};

