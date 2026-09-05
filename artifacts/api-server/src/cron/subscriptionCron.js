const mongoose = require('mongoose');
const { calculateSubscriptionStatus } = require('../utils/subscriptionUtils');

/**
 * Automated Background Cron Job for Subscription Management.
 * Evaluates subscription and grace period expiry across all client organizations
 * using UTC time and updates paymentStatus in MongoDB.
 */
async function processSubscriptionExpiries() {
  try {
    const Organization = mongoose.model('Organization');
    if (!Organization) return;

    const orgs = await Organization.find({}).exec();
    const now = new Date();

    let updatedCount = 0;
    for (const org of orgs) {
      const subState = calculateSubscriptionStatus(org, now);

      if (subState.isExpired && org.payment_status !== false) {
        await Organization.updateOne(
          { _id: org._id },
          { 
            $set: { payment_status: false, status: 'EXPIRED' },
            $unset: { paymentStatus: 1 }
          }
        );
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[SubscriptionCron] Updated ${updatedCount} expired organization subscriptions to payment_status = false.`);
    }
  } catch (err) {
    console.error('[SubscriptionCron] Error running subscription cron job:', err);
  }
}

let isSubscriptionCronRunning = false;

function startSubscriptionCron(intervalMs = 60 * 60 * 1000) {
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
    console.log('[SubscriptionCron] Skipping cron on secondary PM2 cluster instance:', process.env.NODE_APP_INSTANCE);
    return;
  }

  console.log('[SubscriptionCron] Starting automated subscription evaluation cron job...');

  const executeTick = async () => {
    if (isSubscriptionCronRunning) {
      console.log('[SubscriptionCron] Previous tick still in progress, skipping overlap.');
      return;
    }
    isSubscriptionCronRunning = true;
    try {
      await processSubscriptionExpiries();
    } catch (err) {
      console.error('[SubscriptionCron] Error in subscription cron tick:', err);
    } finally {
      isSubscriptionCronRunning = false;
    }
  };

  // Initial run on server startup
  void executeTick();

  // Recurring interval schedule
  setInterval(executeTick, intervalMs);
}

module.exports = {
  processSubscriptionExpiries,
  startSubscriptionCron,
};
