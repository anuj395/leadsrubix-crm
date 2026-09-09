export type NormalizedStage = 'FRESH' | 'CALLBACK' | 'INTERESTED' | 'QUALIFIED' | 'WON' | 'LOST';

/**
 * Universal CRM Stage Normalizer.
 * Cleans and maps heterogeneous stage strings (e.g. from DB, webhooks, or imports)
 * into canonical lifecycle categories.
 *
 * Prevents casing and whitespace mismatches (e.g., 'NOT INTERESTED' vs 'NOT_INTERESTED').
 */
export function normalizeStage(raw?: unknown): NormalizedStage {
  if (!raw) return 'FRESH';
  const s = String(raw).toUpperCase().trim().replace(/[\s_-]+/g, '_');

  // 1. Deals / Closed Won
  if (s.includes('DEAL') || s.includes('WON') || s.includes('BOOKED') || s.includes('CONVERT')) {
    return 'WON';
  }

  // 2. Disqualified / Lost / Junk (Checked BEFORE Interested to catch "NOT_INTERESTED")
  if (
    s.includes('LOST') ||
    s.includes('NOT_INTEREST') ||
    s.includes('NOT_QUALIF') ||
    s.includes('REFUSED') ||
    s.includes('JUNK') ||
    s.includes('SPAM') ||
    s.includes('DROP') ||
    s.includes('ARCHIV')
  ) {
    return 'LOST';
  }

  // 3. Callbacks / Rescheduled
  if (s.includes('CALLBACK') || s.includes('CALL_BACK') || s.includes('RESCHEDULE') || s.includes('REDIAL')) {
    return 'CALLBACK';
  }

  // 4. Qualified
  if (s.includes('QUALIF')) {
    return 'QUALIFIED';
  }

  // 5. Interested / Contacted
  if (s.includes('INTEREST') || s.includes('CONTACTED') || s.includes('ENGAGED')) {
    return 'INTERESTED';
  }

  // 6. Default to Fresh Inbound
  return 'FRESH';
}
