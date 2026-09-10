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

    // Fetch Inquiries and Deals if entity is Contact
    let inquiries = [];
    let deals = [];
    if (type === 'Contact') {
      try {
        const contactModel = require('../models/contactModel');
        const contact = await contactModel.Contact.findById(id).lean().exec();
        if (contact && Array.isArray(contact.inquiries)) {
          inquiries = contact.inquiries;
        }

        const dealModel = require('../models/dealModel');
        deals = await dealModel.Deal.find({
          organization_id: orgId,
          $or: [{ contact_id: id }, { contactId: id }]
        }).lean().exec();
      } catch (e) {
        console.error('[activityController] Error fetching inquiries/deals for timeline:', e);
      }
    }

    // Standardize mapping for unified feed
    const formattedActivities = [
      ...tasks.map(t => ({
        _id: t._id,
        type: 'Task',
        subject: t.type ? `Task: ${t.type}` : 'Follow-up Task',
        description: t.callback_reason || t.notes || 'No description provided',
        status: t.status,
        createdAt: t.createdAt || t.created_at,
        dueDate: t.due_date || t.dueDate || t.next_follow_up || t.nextFollowUp,
        assignedTo: t.assigned_to || t.contact_owner_email
      })),
      ...callLogs.map(c => ({
        _id: c._id,
        type: 'CallLog',
        subject: c.type ? `Call (${c.type})` : 'Phone Call Record',
        description: c.details || (c.stage ? `Outcome: ${c.stage}` : 'Call logged'),
        status: c.stage || 'COMPLETED',
        createdAt: c.createdAt || c.created_at,
        duration: c.duration,
        assignedTo: c.contact_owner_email || c.created_by
      })),
      ...inquiries.map(inq => ({
        _id: inq.inquiry_id || inq.id,
        type: 'Inquiry',
        subject: `Inbound Inquiry: ${inq.project_name || inq.projectName || 'General Requirement'}`,
        description: inq.notes || (inq.budget ? `Budget: ${inq.budget}` : (inq.source ? `Source: ${inq.source}` : 'Inbound inquiry received')),
        status: inq.status || 'FRESH',
        createdAt: inq.created_at || inq.createdAt || new Date(),
        assignedTo: inq.assigned_to || inq.assignedTo,
        meta: inq
      })),
      ...deals.map(d => ({
        _id: d._id,
        type: 'Deal',
        subject: `Deal: ${d.title || d.name || 'Sales Opportunity'}`,
        description: `Stage: ${d.stage || 'New Enquiry'} • Value: ₹${Number(d.amount || 0).toLocaleString('en-IN')}`,
        status: d.stage,
        createdAt: d.createdAt || d.created_at,
        assignedTo: d.owner_name || d.ownerName,
        meta: d
      }))
    ];

    // Sort descending by date
    formattedActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items: mapWithDualCase(formattedActivities) });
  } catch (err) {
    next(err);
  }
};
