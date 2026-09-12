const leadModel = require('../models/leadModel');
const contactModel = require('../models/contactModel');
const accountModel = require('../models/accountModel');
const { mapWithDualCase, withDualCase } = require('../utils/caseConverter');

const contactService = require('../services/contactService');

exports.list = async (req, res, next) => {
  try {
    const items = await contactService.listForUser({
      authedUser: req.user,
      industryIdQuery: req.query.industryId,
      organizationIdQuery: req.query.organizationId,
      limit: Number(req.query.limit) || 300,
    });
    res.json(mapWithDualCase(items));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const userId = req.user._id || req.user.id;

    const payload = req.body || {};
    const fullName = payload.name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || payload.customer_name || 'Inquiry';
    const phone = payload.phone || payload.contact_no || payload.contact_number || '';
    const email = payload.email || payload.email_id || '';
    const stage = payload.stage || payload.status || payload.lead_status || 'FRESH';
    const project = payload.project || payload.project_name || payload.projectName || '';
    const budget = payload.budget || '';
    const propertyType = payload.propertyType || payload.property_type || '';
    const location = payload.location || '';
    const leadType = payload.leadType || payload.lead_type || 'Buyer';
    const alternateNo = payload.alternateNo || payload.alternate_no || '';
    const source = payload.source || payload.lead_source || payload.leadSource || 'Self Generated';
    const notes = payload.notes || '';

    // Evaluate Ownership / Rule-based Distribution
    let ownerEmail = payload.contact_owner_email || payload.contactOwnerEmail || payload.owner_email || payload.ownerEmail || '';
    let ownerId = payload.owner_id || payload.ownerId || payload.contact_owner_id || payload.contactOwnerId || '';

    if (!ownerEmail && !ownerId) {
      try {
        const { assignLeadByRules } = require('../services/leadDistributionService');
        const assignment = await assignLeadByRules({
          organizationId: orgId,
          source: source,
          project: project,
          location: location,
          budget: budget,
          propertyType: propertyType,
        });
        if (assignment && (assignment.ownerEmail || assignment.uid)) {
          ownerEmail = assignment.ownerEmail;
          ownerId = assignment.uid;
        }
      } catch (err) {
        console.error('[leadController] assignLeadByRules error:', err.message || err);
      }
    }

    if (!ownerEmail && !ownerId) {
      ownerEmail = req.user.email || '';
      ownerId = String(userId || '');
    }

    // 1. Enterprise Deduplication: Check if Contact already exists in organization
    let contactDoc = null;
    if (phone) {
      contactDoc = await contactModel.Contact.findOne({
        organization_id: orgId,
        $or: [
          { contact_number: phone },
          { contactNumber: phone }
        ]
      }).exec();
    }

    if (contactDoc) {
      // Existing contact identified: Append inquiry
      await contactService.appendInquiry(contactDoc._id, {
        source,
        campaign: payload.campaign || '',
        projectName: project,
        propertyType,
        budget,
        notes
      }, req.user);
      contactDoc = await contactModel.Contact.findById(contactDoc._id).exec();
    } else {
      contactDoc = await contactModel.create({
        customer_name: fullName,
        contact_number: phone,
        alternate_no: alternateNo,
        email_id: email,
        stage: stage,
        lead_type: leadType,
        location: location,
        project_name: project,
        budget: budget,
        property_type: propertyType,
        source: source,
        notes: notes,
        organization_id: orgId,
        created_by: userId,
        contact_owner_email: ownerEmail,
        contact_owner_id: ownerId,
        assigned_to: ownerEmail,
      }).catch(err => {
        console.error('[leadController] Error saving to Contact model:', err);
        return null;
      });
    }

    // 2. Dual-write to Lead collection
    const leadDoc = await leadModel.create({
      first_name: fullName.split(' ')[0] || '',
      last_name: fullName.split(' ').slice(1).join(' ') || '',
      phone: phone,
      email: email,
      lead_status: stage,
      lead_source: source,
      project: project,
      budget: budget,
      property_type: propertyType,
      alternate_no: alternateNo,
      location: location,
      lead_type: leadType,
      organization_id: orgId,
      created_by: userId,
      owner_id: ownerId,
    }).catch(err => {
      console.error('[leadController] Error saving to Lead model:', err);
      return null;
    });

    if (contactDoc || leadDoc) {
      try {
        const { dispatchCrmEvent } = require('../services/notificationDispatcherService');
        const contactPayload = contactDoc || {
          _id: leadDoc?._id || null,
          id: leadDoc?._id || null,
          customer_name: fullName,
          customerName: fullName,
          contact_number: phone,
          contactNumber: phone,
          email: email,
          source: source,
          project_name: project,
          projectName: project,
          budget: budget,
          property_type: propertyType,
          propertyType: propertyType,
          location: location,
          contact_owner_email: ownerEmail,
          contactOwnerEmail: ownerEmail,
          assigned_to: ownerEmail,
          assignedTo: ownerEmail,
          uid: ownerId,
          contact_owner_id: ownerId,
          contactOwnerId: ownerId
        };

        dispatchCrmEvent({
          eventKey: 'lead.created',
          organizationId: orgId,
          entityType: 'contact',
          entityData: contactPayload
        }).catch(err => console.error('[NotificationDispatcher] lead.created error in leadController:', err));
      } catch (e) {
        console.error('[NotificationDispatcher] Failed to initiate dispatch in leadController:', e);
      }
    }

    const result = contactDoc || leadDoc || { message: 'Created' };
    res.status(201).json(withDualCase(result));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = req.body || {};

    const [updatedLead, updatedContact] = await Promise.all([
      leadModel.findByIdAndUpdate(id, { $set: body }, { new: true }).catch(() => null),
      contactModel.findByIdAndUpdate(id, { $set: body }, { new: true }).catch(() => null)
    ]);

    res.json(updatedContact || updatedLead || { message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

exports.transition = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { stage, status, remarks } = req.body || {};
    const targetStage = stage || status;

    if (!targetStage) {
      return res.status(400).json({ message: 'Target stage is required' });
    }

    const now = new Date();
    const updateObj = {
      stage: targetStage,
      property_stage: targetStage,
      lead_status: targetStage,
      stage_change_at: now,
      modified_at: now,
      ...(remarks ? { notes: remarks } : {})
    };

    const [updatedContact, updatedLead] = await Promise.all([
      contactModel.findByIdAndUpdate(id, { $set: updateObj }, { new: true }).catch(() => null),
      leadModel.findByIdAndUpdate(id, { $set: { lead_status: targetStage, stage: targetStage } }, { new: true }).catch(() => null)
    ]);

    const activeRecord = updatedContact || updatedLead;
    if (activeRecord) {
      try {
        const { dispatchCrmEvent } = require('../services/notificationDispatcherService');
        dispatchCrmEvent({
          eventKey: 'lead.stage_changed',
          organizationId: activeRecord.organization_id || activeRecord.organizationId,
          entityType: 'contact',
          entityData: activeRecord
        }).catch(err => console.error('[NotificationDispatcher] lead.stage_changed error:', err));
      } catch (e) {}
    }

    res.json({
      message: 'Stage transitioned successfully',
      stage: targetStage,
      record: activeRecord
    });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await Promise.all([
      leadModel.remove(id).catch(() => null),
      contactModel.remove(id).catch(() => null)
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.retrieve = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [lead, contact] = await Promise.all([
      leadModel.findById(id).catch(() => null),
      contactModel.findById(id).catch(() => null)
    ]);

    if (!lead && !contact) return res.status(404).json({ message: 'Lead or Contact not found' });
    res.json(withDualCase(contact || lead));
  } catch (err) {
    next(err);
  }
};

exports.convert = async (req, res, next) => {
  try {
    const leadId = req.body.leadId || req.body.lead_id;
    if (!leadId) return res.status(400).json({ message: 'leadId is required' });

    const contactService = require('../services/contactService');
    const result = await contactService.convertContact({
      contactId: leadId,
      payload: req.body,
      authedUser: req.user
    });

    res.json({
      message: 'Lead converted to Deal successfully',
      ...result
    });
  } catch (err) {
    next(err);
  }
};
