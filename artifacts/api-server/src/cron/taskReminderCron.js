const mongoose = require('mongoose');
const { dispatchCrmEvent } = require('../services/notificationDispatcherService');

/**
 * Task Reminder Cron
 * Runs every 2-5 minutes to find scheduled follow-up callbacks or tasks due soon
 * and dispatches task.reminder across WhatsApp, Email, Push, and In-App channels.
 */
async function processTaskReminders() {
  try {
    const Task = mongoose.model('Task');
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000); // due in next 15 mins
    const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // not older than 2 hours

    const dueTasks = await Task.find({
      status: { $in: ['PENDING', 'ACTIVE'] },
      $or: [
        { reminder_sent: false },
        { reminder_sent: null },
        { reminderSent: false },
        { reminderSent: null }
      ],
      due_date: { $gte: windowStart, $lte: windowEnd }
    }).limit(50).exec();

    if (!dueTasks || dueTasks.length === 0) {
      return;
    }

    console.log(`[TaskReminderCron] Found ${dueTasks.length} tasks/callbacks due for reminder.`);

    for (const task of dueTasks) {
      try {
        const orgId = task.organization_id || task.organizationId || null;
        await dispatchCrmEvent({
          eventKey: 'task.reminder',
          organizationId: orgId,
          entityType: 'task',
          entityData: {
            _id: task._id,
            id: task._id,
            customerName: task.customer_name || task.customerName,
            contactNumber: task.contact_number || task.contactNumber,
            contactOwnerEmail: task.assigned_to || task.assignedTo || task.contact_owner_email || task.contactOwnerEmail,
            taskTitle: task.task_type || task.type || 'Scheduled Follow-up',
            dueDate: task.due_date ? new Date(task.due_date).toLocaleString('en-IN') : 'Now',
            nextFollowUpType: task.type || 'Call Back',
            callBackReason: task.callback_reason || task.callbackReason || 'Scheduled Follow-up'
          }
        });

        // Mark reminder as sent
        task.reminder_sent = true;
        task.reminderSent = true;
        await task.save().catch(e => console.warn('[TaskReminderCron] Save error:', e.message));
      } catch (taskErr) {
        console.error(`[TaskReminderCron] Error dispatching reminder for task ${task._id}:`, taskErr.message);
      }
    }
  } catch (err) {
    console.error('[TaskReminderCron] Unhandled error processing task reminders:', err.message);
  }
}

/**
 * Starts the task reminder cron interval (every 2 minutes)
 */
function startTaskReminderCron() {
  const slaTriggerService = require('../services/slaTriggerService');

  // Initial check after 30 seconds
  setTimeout(() => {
    processTaskReminders().catch(() => {});
    slaTriggerService.checkAndTriggerBreachedSlas().catch(() => {});
  }, 30000);

  // Repeat every 2 minutes
  setInterval(() => {
    processTaskReminders().catch(() => {});
    slaTriggerService.checkAndTriggerBreachedSlas().catch(() => {});
  }, 2 * 60 * 1000);

  console.log('[TaskReminderCron] Scheduled task reminder & SLA escalation background worker (runs every 2 mins).');
}

module.exports = {
  processTaskReminders,
  startTaskReminderCron
};
