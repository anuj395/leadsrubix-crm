/**
 * Universal Source Matcher Service
 * 
 * Provides robust, non-hardcoded, case-insensitive, space-agnostic, 
 * and token-based matching between lead sources (from webhooks, mobile, APIs)
 * and configured routing/SLA rules (Lead Distribution & Lead Reassignment).
 */

/**
 * Normalizes a source string by removing whitespace, hyphens, underscores, and dots.
 * @param {string} str 
 * @returns {string}
 */
function normalizeSource(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[\s\-_.]/g, '');
}

/**
 * Strips common digital marketing / portal suffixes (e.g. .com, .in, portal, ads, campaign)
 * to compare core source roots.
 * @param {string} str 
 * @returns {string}
 */
function getSourceRoot(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\.(com|in|co\.in|org|net|io)\b/gi, '')
    .replace(/\b(portal|leads|ads|campaign|search|form|webhook|api)\b/gi, '')
    .replace(/[\s\-_.]/g, '');
}

/**
 * Compares an incoming lead source against a rule source.
 * Fully universal and dynamic: works for WebSite, Housing.com, 99 Acres, MagicBricks,
 * Google Ads, Meta/Facebook, Walk-in, or any custom source created in Resources.
 * 
 * @param {string} leadSource 
 * @param {string} ruleSource 
 * @returns {boolean}
 */
function matchSources(leadSource, ruleSource) {
  if (!ruleSource || ruleSource === 'all' || ruleSource === 'any' || ruleSource === 'All') {
    return true; // Wildcard matches all
  }
  if (!leadSource) {
    return false;
  }

  const cleanLead = String(leadSource).trim().toLowerCase();
  const cleanRule = String(ruleSource).trim().toLowerCase();

  // 1. Exact string match (case-insensitive)
  if (cleanLead === cleanRule) return true;

  // 2. Substring inclusion match (e.g. 'Google Ads' in 'Google Search Ads')
  if (cleanLead.includes(cleanRule) || cleanRule.includes(cleanLead)) return true;

  // 3. Space & punctuation normalized match (e.g. '99 Acres' vs '99acres' vs '99Acres')
  const normLead = normalizeSource(cleanLead);
  const normRule = normalizeSource(cleanRule);
  if (normLead === normRule) return true;
  if (normLead.length >= 3 && normRule.length >= 3) {
    if (normLead.includes(normRule) || normRule.includes(normLead)) return true;
  }

  // 4. Root comparison (e.g. 'Housing.com' vs 'Housing', 'Makaan.com' vs 'Makaan')
  const rootLead = getSourceRoot(cleanLead);
  const rootRule = getSourceRoot(cleanRule);
  if (rootLead && rootRule && (rootLead === rootRule || rootLead.includes(rootRule) || rootRule.includes(rootLead))) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether an incoming lead matches a rule by checking both its primary source
 * and secondary campaign name.
 * 
 * @param {string} leadSource 
 * @param {string} leadCampaign 
 * @param {string} ruleSource 
 * @returns {boolean}
 */
function matchLeadSourceAndCampaign(leadSource, leadCampaign, ruleSource) {
  if (!ruleSource || ruleSource.toLowerCase() === 'all' || ruleSource.toLowerCase() === 'any') {
    return true;
  }
  if (matchSources(leadSource, ruleSource)) {
    return true;
  }
  if (leadCampaign && matchSources(leadCampaign, ruleSource)) {
    return true;
  }
  return false;
}

module.exports = {
  normalizeSource,
  getSourceRoot,
  matchSources,
  matchLeadSourceAndCampaign
};
