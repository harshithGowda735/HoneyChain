/**
 * Scheme Personalised Relevance Calculator
 * Evaluates candidate government schemes against actual user profile details
 * and registered hives data.
 */

export const RELEVANCE_STATUSES = {
  POTENTIALLY_RELEVANT: 'potentially_relevant',
  MORE_INFO_REQUIRED: 'more_info_required',
  CONDITIONS_NOT_MET: 'conditions_not_met',
  WINDOW_UNKNOWN: 'window_unknown',
};

export const RELEVANCE_LABELS = {
  potentially_relevant: 'Potentially Relevant',
  more_info_required: 'More Info Required',
  conditions_not_met: 'Conditions Not Met',
  window_unknown: 'Application Window Unknown',
};

/**
 * Evaluates how relevant a scheme is based strictly on provided profile data.
 * Does not make assumptions or claim guaranteed eligibility.
 * 
 * @param {Object} scheme - Scheme from verifiedSchemes
 * @param {Object} profile - User profile { state, district, experienceLevel, entityType, landStatus }
 * @param {number} hivesCount - Count of actual registered hives in HoneyChain
 * @returns {Object} { status, label, matchReasons, missingInfo, explanation }
 */
export function evaluateSchemeRelevance(scheme, profile = {}, hivesCount = 0) {
  const userState = (profile.state || '').trim().toLowerCase();
  const userEntity = profile.entityType || 'individual';
  const userExp = profile.experienceLevel;
  const userLand = profile.landStatus;

  const matchReasons = [];
  const missingInfo = [];
  let isStateMatched = false;
  let isStateDefiniteMismatch = false;

  // 1. Check State Match
  const schemeStates = (scheme.applicableStates || []).map((s) => s.toLowerCase());
  const isCentral = scheme.level === 'Central' || schemeStates.includes('all');

  if (isCentral) {
    isStateMatched = true;
    matchReasons.push('Central Government scheme applicable across all Indian states and Union Territories.');
  } else {
    // State-specific scheme
    const targetState = (scheme.state || '').toLowerCase();
    if (!userState) {
      missingInfo.push(`Requires residency in ${scheme.state}. Add your State in profile to verify.`);
    } else if (userState === targetState || schemeStates.includes(userState)) {
      isStateMatched = true;
      matchReasons.push(`Matches your registered state location in ${scheme.state}.`);
    } else {
      isStateDefiniteMismatch = true;
    }
  }

  // Definite mismatch if it's a specific state scheme and user is registered in another state
  if (isStateDefiniteMismatch) {
    return {
      status: RELEVANCE_STATUSES.CONDITIONS_NOT_MET,
      label: RELEVANCE_LABELS.conditions_not_met,
      matchReasons: [],
      missingInfo: [],
      explanation: `This programme is exclusively operated by the ${scheme.department} for residents of ${scheme.state}. Your profile indicates a different location.`,
    };
  }

  // 2. Check Target Beneficiary / Entity Type
  const targetBeneficiaries = scheme.targetBeneficiaries || ['individual'];
  const entityMatches = targetBeneficiaries.includes(userEntity);

  if (entityMatches) {
    if (userEntity === 'individual') {
      matchReasons.push('Accepts individual beekeepers and rural honey producers.');
    } else if (userEntity === 'farmer') {
      matchReasons.push('Beneficiary category covers agricultural cultivators and orchard growers.');
    } else if (userEntity === 'enterprise') {
      matchReasons.push('Designed for micro food processing enterprises and honey packaging units.');
    } else if (userEntity === 'fpo_shg') {
      matchReasons.push('Supports Farmer Producer Organizations (FPOs) and Self Help Groups.');
    }
  } else {
    if (scheme.id === 'aif-honey-infrastructure' && userEntity === 'individual') {
      // AIF is mainly for enterprises, FPOs, PACS
      missingInfo.push('AIF primarily finances registered agri-enterprises, FPOs, cooperatives, or startups. Individual hobbyists are typically not eligible without entity registration.');
    }
  }

  // 3. Check Scale / Hives Information
  if (hivesCount > 0) {
    matchReasons.push(`You have ${hivesCount} active colony ${hivesCount === 1 ? 'hive' : 'hives'} registered in HoneyChain.`);
  }

  // 4. Missing required profile inputs
  if (!userState && !isCentral) {
    missingInfo.push('State location is not yet specified in your profile.');
  }

  if (scheme.id === 'karnataka-apiculture-scheme') {
    if (!profile.district) {
      missingInfo.push('District is unconfirmed. Applications are administered through your specific Taluk SADH office.');
    }
    if (!userLand) {
      missingInfo.push('Agricultural RTC / Pahani (landholding) status is required for the state subsidy.');
    }
  }

  if (scheme.id === 'pmfme-honey-processing') {
    if (!userExp) {
      missingInfo.push('Enterprise scale / business experience not indicated.');
    }
    matchReasons.push('Requires setting up honey filtering, bottling, or packaging equipment with bank term loan.');
  }

  if (scheme.id === 'nbhm-national-honey-mission') {
    if (!profile.madhukrantiRegistered) {
      missingInfo.push('Requires registration on the national Madhukranti Portal (madhukranti.in) to qualify for official ID and scheme benefits.');
    } else {
      matchReasons.push('You indicated active registration on the Madhukranti Portal.');
    }
  }

  // 5. Determine Final Relevance Status
  let status = RELEVANCE_STATUSES.POTENTIALLY_RELEVANT;
  let explanation = '';

  if (scheme.reviewStatus === 'periodic_window') {
    status = RELEVANCE_STATUSES.WINDOW_UNKNOWN;
    explanation = 'Applications are invited periodically during specific financial year windows by the state department. Contact your local office for current physical targets.';
  } else if (missingInfo.length > 0 && matchReasons.length <= 1) {
    status = RELEVANCE_STATUSES.MORE_INFO_REQUIRED;
    explanation = `More information needed: ${missingInfo[0]}`;
  } else if (missingInfo.length > 0) {
    status = RELEVANCE_STATUSES.POTENTIALLY_RELEVANT;
    explanation = `${matchReasons[0]} Note: Complete additional profile details to confirm full eligibility.`;
  } else {
    status = RELEVANCE_STATUSES.POTENTIALLY_RELEVANT;
    explanation = matchReasons.join(' ');
  }

  return {
    status,
    label: RELEVANCE_LABELS[status],
    matchReasons,
    missingInfo,
    explanation,
  };
}

export default {
  RELEVANCE_STATUSES,
  RELEVANCE_LABELS,
  evaluateSchemeRelevance,
};
