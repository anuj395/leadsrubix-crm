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

const GENERIC_SOURCE_TOKENS = new Set([
  'website', 'web', 'ads', 'lead', 'leads', 'form', 'forms', 'portal', 'api', 'call', 'calls', 'inquiry', 'inquiries'
]);

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
  if (!ruleSource) return true;
  if (Array.isArray(ruleSource)) {
    if (ruleSource.length === 0) return true;
    return ruleSource.some(rs => matchSources(leadSource, rs));
  }

  const cleanRule = String(ruleSource).trim().toLowerCase();
  if (cleanRule === 'all' || cleanRule === 'any' || cleanRule === '') {
    return true; // Wildcard matches all
  }
  if (!leadSource) {
    return false;
  }

  const cleanLead = String(leadSource).trim().toLowerCase();

  // 1. Exact string match (case-insensitive)
  if (cleanLead === cleanRule) return true;

  // 2. Substring inclusion match:
  // - If lead is a specific variant containing the rule (e.g. 'Google Search Ads' contains rule 'Google Ads')
  // - Avoid matching when lead is a generic single token (e.g. lead 'Website' should NEVER match rule 'Hospital Website')
  if (cleanLead.includes(cleanRule)) return true;
  if (!GENERIC_SOURCE_TOKENS.has(cleanLead) && cleanRule.includes(cleanLead)) return true;

  // 3. Space & punctuation normalized match (e.g. '99 Acres' vs '99acres' vs '99Acres')
  const normLead = normalizeSource(cleanLead);
  const normRule = normalizeSource(cleanRule);
  if (normLead === normRule) return true;
  if (normLead.length >= 3 && normRule.length >= 3) {
    if (normLead.includes(normRule)) return true;
    if (!GENERIC_SOURCE_TOKENS.has(normLead) && normRule.includes(normLead)) return true;
  }

  // 4. Root comparison (e.g. 'Housing.com' vs 'Housing', 'Makaan.com' vs 'Makaan')
  const rootLead = getSourceRoot(cleanLead);
  const rootRule = getSourceRoot(cleanRule);
  if (rootLead && rootRule) {
    if (rootLead === rootRule) return true;
    if (rootLead.includes(rootRule)) return true;
    if (!GENERIC_SOURCE_TOKENS.has(rootLead) && rootRule.includes(rootLead)) return true;
  }

  return false;
}

/**
 * Safely canonicalizes an incoming source name against an organization's registered sources.
 * Strictly preserves generic sources (e.g. 'Website', 'Walk-in') from being rewritten
 * into vertical-specific compound sources (e.g. 'Hospital Website', 'College Walk-in').
 * 
 * @param {string} incomingSource 
 * @param {Array<string>} registeredSources 
 * @returns {string}
 */
function canonicalizeSource(incomingSource, registeredSources = []) {
  if (!incomingSource) return '';
  const cleanIncoming = String(incomingSource).trim();
  if (!cleanIncoming) return '';
  if (!Array.isArray(registeredSources) || registeredSources.length === 0) {
    return cleanIncoming;
  }

  const lowerIncoming = cleanIncoming.toLowerCase();
  const normIncoming = normalizeSource(cleanIncoming);
  const rootIncoming = getSourceRoot(cleanIncoming);

  // 1. Exact string match (case-insensitive)
  for (const reg of registeredSources) {
    if (!reg) continue;
    const cleanReg = String(reg).trim();
    if (cleanReg.toLowerCase() === lowerIncoming) {
      return cleanReg;
    }
  }

  // 2. Normalized space & punctuation match (e.g. '99acres' -> '99 Acres', 'just-dial' -> 'Justdial')
  for (const reg of registeredSources) {
    if (!reg) continue;
    const cleanReg = String(reg).trim();
    if (normalizeSource(cleanReg) === normIncoming) {
      return cleanReg;
    }
  }

  // 3. Root comparison (e.g. 'housing.com' -> 'Housing.com', 'makaan.com' -> 'Makaan.com')
  if (rootIncoming) {
    for (const reg of registeredSources) {
      if (!reg) continue;
      const cleanReg = String(reg).trim();
      const rootReg = getSourceRoot(cleanReg);
      if (rootReg && rootReg === rootIncoming) {
        return cleanReg;
      }
    }
  }

  // 4. Safe prefix match ONLY when incoming starts with registered source (e.g. 'Facebook Lead Ad' -> 'Facebook')
  for (const reg of registeredSources) {
    if (!reg) continue;
    const cleanReg = String(reg).trim();
    const lowerReg = cleanReg.toLowerCase();
    if (lowerIncoming.startsWith(lowerReg) && lowerIncoming.length > lowerReg.length) {
      return cleanReg;
    }
  }

  // If no match in organization's registered sources, return the original incoming source untouched
  return cleanIncoming;
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
  canonicalizeSource,
  matchLeadSourceAndCampaign
};
