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

    // Query active/pending tasks with un-sent reminders (immunized against raw SQL JSONB cast errors)
    const activeTasks = await Task.find({
      status: { $in: ['PENDING', 'ACTIVE'] },
      $or: [
        { reminder_sent: false },
        { reminder_sent: null },
        { reminderSent: false },
        { reminderSent: null }
      ]
    }).limit(100).exec();

    if (!activeTasks || activeTasks.length === 0) {
      return;
    }

    // Filter tasks safely in JavaScript (handles due_date, dueDate, next_follow_up without SQL syntax crashes)
    const dueTasks = [];
    for (const task of activeTasks) {
      if (task.reminder_sent === true || task.reminderSent === true) continue;
      const rawDate = task.due_date || task.dueDate || task.next_follow_up || task.nextFollowUp;
      if (!rawDate) continue;
      const parsedTime = new Date(rawDate).getTime();
      if (isNaN(parsedTime)) continue;

      if (parsedTime >= windowStart.getTime() && parsedTime <= windowEnd.getTime()) {
        dueTasks.push({ task, rawDate });
      }
    }

    if (dueTasks.length === 0) {
      return;
    }

    console.log(`[TaskReminderCron] Found ${dueTasks.length} tasks/callbacks due for reminder.`);

    for (const { task, rawDate } of dueTasks) {
      try {
        let custName = task.customer_name || task.customerName || '';
        let custPhone = task.contact_number || task.contactNumber || '';
        let ownerEmail = task.assigned_to || task.assignedTo || task.contact_owner_email || task.contactOwnerEmail || '';
        let ownerId = task.uid || task.contact_owner_id || task.contactOwnerId || task.created_by || task.createdBy || '';
        let orgId = task.organization_id || task.organizationId || null;

        const cId = task.contact_id || task.contactId;
        if (cId && (!custName || !custPhone || !ownerEmail || !orgId)) {
          try {
            const Contact = mongoose.model('Contact');
            const contactDoc = await Contact.findById(cId).lean().exec();
            if (contactDoc) {
              custName = custName || contactDoc.customer_name || contactDoc.customerName || '';
              custPhone = custPhone || contactDoc.contact_number || contactDoc.contactNumber || contactDoc.phone || '';
              ownerEmail = ownerEmail || contactDoc.contact_owner_email || contactDoc.contactOwnerEmail || contactDoc.assigned_to || contactDoc.assignedTo || '';
              ownerId = ownerId || contactDoc.contact_owner_id || contactDoc.contactOwnerId || contactDoc.uid || '';
              orgId = orgId || contactDoc.organization_id || contactDoc.organizationId || null;
            }
          } catch (cErr) {
            // non-fatal
          }
        }

        const assignedRep = task.assigned_to || task.assignedTo || task.assigned_user_name || task.assignedUserName || ownerEmail || '';
        const taskSubject = task.title || task.name || task.task_title || task.taskTitle || task.task_type || task.taskType || task.type || 'Task';
        const taskTypeStr = task.task_type || task.taskType || task.type || task.action_type || 'Task';

        await dispatchCrmEvent({
          eventKey: 'task.reminder',
          organizationId: orgId,
          entityType: 'task',
          entityData: {
            _id: String(task._id),
            id: String(task._id),
            contact_id: cId ? String(cId) : '',
            contactId: cId ? String(cId) : '',
            customerName: custName,
            customer_name: custName,
            contactNumber: custPhone,
            contact_number: custPhone,
            contactOwnerEmail: ownerEmail,
            contact_owner_email: ownerEmail,
            contactOwnerId: ownerId,
            contact_owner_id: ownerId,
            assignedTo: assignedRep,
            assigned_to: assignedRep,
            taskTitle: taskSubject,
            task_title: taskSubject,
            task_type: taskTypeStr,
            taskType: taskTypeStr,
            type: taskTypeStr,
            dueDate: new Date(rawDate).toLocaleString(),
            due_date: new Date(rawDate).toISOString(),
            nextFollowUpType: task.type || taskTypeStr,
            callBackReason: task.callback_reason || task.callbackReason || ''
          }
        });

        // Mark reminder as sent atomically in DB
        task.reminder_sent = true;
        task.reminderSent = true;
        await task.save().catch(e => console.warn('[TaskReminderCron] Save error:', e.message));
        await Task.findByIdAndUpdate(task._id, {
          $set: { reminder_sent: true, reminderSent: true }
        }).exec().catch(e => console.warn('[TaskReminderCron] findByIdAndUpdate error:', e.message));
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
