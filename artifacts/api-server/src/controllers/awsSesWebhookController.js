const mongoose = require('mongoose');

/**
 * Endpoint: POST /api/webhooks/aws-ses
 * Handles real-time AWS SNS / SES event notifications for Bounces, Complaints, Deliveries, and Opens/Clicks.
 */
exports.handleSesWebhook = async (req, res, next) => {
  try {
    const body = req.body || {};
    const messageType = req.headers['x-amz-sns-message-type'] || body.Type;

    // Handle AWS SNS Subscription Confirmation
    if (messageType === 'SubscriptionConfirmation') {
      console.log('[awsSesWebhookController] AWS SNS Subscription Confirmation URL:', body.SubscribeURL);
      return res.status(200).send('SubscriptionConfirmed');
    }

    let payload = body;
    if (typeof body.Message === 'string') {
      try {
        payload = JSON.parse(body.Message);
      } catch (e) {
        // Keep raw body
      }
    }

    const eventType = payload.eventType || payload.notificationType;
    const mail = payload.mail || {};
    const messageId = mail.messageId;

    console.log(`[awsSesWebhookController] Received AWS SES Event: ${eventType} (MessageId: ${messageId})`);

    const EmailLog = mongoose.model('EmailLog');
    const EmailSuppression = mongoose.model('EmailSuppression');

    if (eventType === 'Bounce') {
      const bounce = payload.bounce || {};
      const bouncedRecipients = bounce.bouncedRecipients || [];
      const bounceType = bounce.bounceType; // 'Permanent' or 'Transient'

      for (const recipientObj of bouncedRecipients) {
        const recipientEmail = String(recipientObj.emailAddress || '').toLowerCase().trim();

        // 1. Update EmailLog status to BOUNCED
        if (messageId) {
          await EmailLog.updateMany(
            { ses_message_id: messageId },
            { $set: { status: 'BOUNCED', error_message: `Bounced (${bounceType}): ${recipientObj.diagnosticCode || 'Hard Bounce'}` } }
          );
        }

        // 2. Add to Workspace Suppression List if Permanent Hard Bounce
        if (bounceType === 'Permanent' && recipientEmail) {
          const logDoc = await EmailLog.findOne({ ses_message_id: messageId }).lean().exec();
          const orgId = logDoc?.organization_id || 'GLOBAL';

          await EmailSuppression.updateOne(
            { organization_id: orgId, email: recipientEmail },
            {
              $set: {
                organization_id: orgId,
                email: recipientEmail,
                reason: 'HARD_BOUNCE',
                details: { bounceType, diagnosticCode: recipientObj.diagnosticCode }
              }
            },
            { upsert: true }
          );
          console.log(`[awsSesWebhookController] Added email ${recipientEmail} to suppression list for org ${orgId}`);
        }
      }
    } else if (eventType === 'Complaint') {
      const complaint = payload.complaint || {};
      const complainedRecipients = complaint.complainedRecipients || [];

      for (const recipientObj of complainedRecipients) {
        const recipientEmail = String(recipientObj.emailAddress || '').toLowerCase().trim();

        if (messageId) {
          await EmailLog.updateMany(
            { ses_message_id: messageId },
            { $set: { status: 'COMPLAINT', error_message: 'Recipient marked email as Spam Complaint' } }
          );
        }

        if (recipientEmail) {
          const logDoc = await EmailLog.findOne({ ses_message_id: messageId }).lean().exec();
          const orgId = logDoc?.organization_id || 'GLOBAL';

          await EmailSuppression.updateOne(
            { organization_id: orgId, email: recipientEmail },
            {
              $set: {
                organization_id: orgId,
                email: recipientEmail,
                reason: 'SPAM_COMPLAINT',
                details: { complaintFeedbackType: complaint.complaintFeedbackType }
              }
            },
            { upsert: true }
          );
          console.log(`[awsSesWebhookController] Suppressed recipient ${recipientEmail} due to Spam Complaint.`);
        }
      }
    } else if (eventType === 'Delivery') {
      if (messageId) {
        await EmailLog.updateMany(
          { ses_message_id: messageId },
          { $set: { status: 'SENT' } }
        );
      }
    }

    res.json({ success: true, eventType, messageId });
  } catch (err) {
    console.error('[awsSesWebhookController] Error handling SES webhook:', err);
    next(err);
  }
};
