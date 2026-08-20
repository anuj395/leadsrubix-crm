const taskModel = require('../models/taskModel');
const callLogModel = require('../models/callLogModel');
const { mapWithDualCase } = require('../utils/caseConverter');

exports.timeline = async (req, res, next) => {
  try {
    const type = req.query.type; // Lead, Account, Contact, Deal
    const id = req.query.id; // Object ID
    if (!type || !id) {
      return res.status(400).json({ message: 'Both type and id parameters are required' });
    }

    const orgId = req.user.organization_id || req.user.organizationId;

    // Fetch Tasks
    const taskFilter = {
      organization_id: orgId,
      $or: [
        { related_to_type: type, related_to_id: id },
        { contact_id: id }
      ]
    };
    const tasks = await taskModel.Task.find(taskFilter).lean().exec();

    // Fetch Call Logs
    const callFilter = {
      organization_id: orgId,
      $or: [
        { related_to_type: type, related_to_id: id },
        { contact_id: id }
      ]
    };
    const callLogs = await callLogModel.CallLog.find(callFilter).lean().exec();

    // Standardize mapping for unified feed
    const formattedActivities = [
      ...tasks.map(t => ({
        _id: t._id,
        type: 'Task',
        subject: t.type || 'Task Assignment',
        description: t.callback_reason || t.notes || 'No description provided',
        status: t.status,
        createdAt: t.createdAt || t.created_at,
        assignedTo: t.assigned_to || t.contact_owner_email
      })),
      ...callLogs.map(c => ({
        _id: c._id,
        type: 'CallLog',
        subject: c.type ? `Call Log: ${c.type}` : 'Phone Call Record',
        description: c.details || 'No details logged',
        status: 'COMPLETED',
        createdAt: c.createdAt || c.created_at,
        duration: c.duration,
        assignedTo: c.contact_owner_email || c.created_by
      }))
    ];

    // Sort descending by date
    formattedActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items: mapWithDualCase(formattedActivities) });
  } catch (err) {
    next(err);
  }
};
