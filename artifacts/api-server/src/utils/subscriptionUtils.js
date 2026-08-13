/**
 * Centralized, enterprise-grade Subscription & Access calculation utility.
 * Enforces UTC time calculations and tenant-isolated subscription rules.
 */

function calculateSubscriptionStatus(org, nowInput = new Date()) {
  if (!org) {
    return {
      status: 'NO_ORG',
      isExpired: false,
      isTrial: false,
      isGracePeriod: false,
      paymentStatus: true,
      daysRemaining: 0,
      expiryDate: null,
      reason: 'No organization attached',
    };
  }

  const now = new Date(nowInput).getTime();

  const isTrial = org.trial_period === true || org.trial_period === 'true' || org.trialPeriod === true || org.trialPeriod === 'true';
  const trialDays = typeof org.trial_period_days === 'number' ? org.trial_period_days : (typeof org.trialPeriodDays === 'number' ? org.trialPeriodDays : 7);
  const graceDays = typeof org.grace_period_days === 'number' ? org.grace_period_days : (typeof org.gracePeriodDays === 'number' ? org.gracePeriodDays : 7);

  const rawValidFrom = org.valid_from || org.validFrom || org.created_at || org.createdAt;
  const startDate = rawValidFrom ? new Date(rawValidFrom).getTime() : now;

  let isExpired = false;
  let isGracePeriod = false;
  let status = 'ACTIVE';
  let daysRemaining = 0;
  let expiryDate = null;
  let reason = '';

  if (isTrial) {
    const trialExpiry = startDate + trialDays * 24 * 60 * 60 * 1000;
    expiryDate = new Date(trialExpiry);

    if (now <= trialExpiry) {
      status = 'TRIAL_ACTIVE';
      isExpired = false;
      daysRemaining = Math.max(1, Math.ceil((trialExpiry - now) / (1000 * 60 * 60 * 24)));
      reason = `Trial active (${daysRemaining} days remaining)`;
    } else {
      status = 'TRIAL_EXPIRED';
      isExpired = true;
      daysRemaining = 0;
      reason = 'Trial period expired';
    }
  } else {
    const rawValidTill = org.valid_till || org.validTill;
    const validTill = rawValidTill ? new Date(rawValidTill).getTime() : startDate + trialDays * 24 * 60 * 60 * 1000;
    const graceExpiry = validTill + graceDays * 24 * 60 * 60 * 1000;

    if (now <= validTill) {
      status = 'SUBSCRIPTION_ACTIVE';
      isExpired = false;
      expiryDate = new Date(validTill);
      daysRemaining = Math.max(1, Math.ceil((validTill - now) / (1000 * 60 * 60 * 24)));
      reason = `Subscription active (${daysRemaining} days remaining)`;
    } else if (now > validTill && now <= graceExpiry) {
      status = 'GRACE_PERIOD';
      isExpired = false;
      isGracePeriod = true;
      expiryDate = new Date(graceExpiry);
      daysRemaining = Math.max(1, Math.ceil((graceExpiry - now) / (1000 * 60 * 60 * 24)));
      reason = `Grace period active (${daysRemaining} days remaining)`;
    } else {
      status = 'SUBSCRIPTION_EXPIRED';
      isExpired = true;
      expiryDate = new Date(graceExpiry);
      daysRemaining = 0;
      reason = 'Subscription and grace period expired';
    }
  }

  // Force expired if paymentStatus flag is explicitly set to false
  if (org.payment_status === false || org.paymentStatus === false) {
    isExpired = true;
    if (status !== 'TRIAL_EXPIRED' && status !== 'SUBSCRIPTION_EXPIRED') {
      status = 'PAYMENT_FAILED';
    }
  }

  return {
    status,
    isExpired,
    isTrial,
    isGracePeriod,
    paymentStatus: !isExpired,
    daysRemaining,
    expiryDate,
    reason,
  };
}

module.exports = {
  calculateSubscriptionStatus,
};
