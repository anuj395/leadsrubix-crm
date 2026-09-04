const leadModel = require('../models/leadModel');
const contactModel = require('../models/contactModel');
const accountModel = require('../models/accountModel');
const { mapWithDualCase, withDualCase } = require('../utils/caseConverter');

exports.list = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const filter = orgId ? { organization_id: orgId } : {};

    // Concurrently query both Contact collection (Web CRM single source of truth) and Lead collection
    const [leads, contacts] = await Promise.all([
      leadModel.list({ filter }).catch(() => []),
      contactModel.Contact.find(filter).sort({ createdAt: -1 }).limit(300).lean().exec().catch(() => [])
    ]);

    const combined = [];
    const seenIds = new Set();
    const seenPhones = new Set();

    // 1. Add contacts first (Web CRM primary records)
    for (const c of contacts) {
      const idStr = String(c._id);
      const phoneClean = (c.contact_number || c.contactNumber || '').replace(/\D/g, '');
      if (idStr && !seenIds.has(idStr)) {
        seenIds.add(idStr);
        if (phoneClean) seenPhones.add(phoneClean);

        combined.push({
          id: idStr,
          _id: idStr,
          name: c.customer_name || c.customerName || c.name || 'Inquiry',
          customerName: c.customer_name || c.customerName || c.name || 'Inquiry',
          firstName: (c.customer_name || c.customerName || '').split(' ')[0] || '',
          lastName: (c.customer_name || c.customerName || '').split(' ').slice(1).join(' ') || '',
          phone: c.contact_number || c.contactNumber || '',
          contactNumber: c.contact_number || c.contactNumber || '',
          alternateNo: c.alternate_no || c.alternateNo || '',
          email: c.email_id || c.emailId || c.email || '',
          emailId: c.email_id || c.emailId || c.email || '',
          stage: c.stage || c.property_stage || c.propertyStage || 'FRESH',
          status: c.stage || c.property_stage || c.propertyStage || 'FRESH',
          leadType: c.lead_type || c.leadType || 'Buyer',
          location: c.location || '',
          project: c.project_name || c.projectName || c.project || '',
          projectName: c.project_name || c.projectName || c.project || '',
          budget: c.budget || '',
          propertyType: c.property_type || c.propertyType || '',
          source: c.source || c.lead_source || '',
          notes: c.notes || '',
          contactOwnerEmail: c.contact_owner_email || c.contactOwnerEmail || '',
          createdAt: c.createdAt || c.created_at || new Date().toISOString(),
          updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
          isContact: true,
        });
      }
    }

    // 2. Add leads (deduplicating by phone / id)
    for (const l of leads) {
      const idStr = String(l._id || l.id);
      const phoneClean = (l.phone || l.contact_no || '').replace(/\D/g, '');
      if (!seenIds.has(idStr) && (!phoneClean || !seenPhones.has(phoneClean))) {
        seenIds.add(idStr);
        if (phoneClean) seenPhones.add(phoneClean);

        const fullName = l.name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Inquiry';
        combined.push({
          id: idStr,
          _id: idStr,
          name: fullName,
          customerName: fullName,
          firstName: l.first_name || fullName.split(' ')[0] || '',
          lastName: l.last_name || fullName.split(' ').slice(1).join(' ') || '',
          phone: l.phone || l.contact_no || '',
          contactNumber: l.phone || l.contact_no || '',
          alternateNo: l.alternate_no || '',
          email: l.email || '',
          emailId: l.email || '',
          stage: l.lead_status || l.stage || l.status || 'FRESH',
          status: l.lead_status || l.stage || l.status || 'FRESH',
          leadType: l.lead_type || 'Buyer',
          location: l.location || '',
          project: l.project || l.project_name || '',
          projectName: l.project || l.project_name || '',
          budget: l.budget || '',
          propertyType: l.property_type || '',
          source: l.lead_source || l.source || '',
          notes: l.notes || '',
          createdAt: l.createdAt || l.created_at || new Date().toISOString(),
          updatedAt: l.updatedAt || l.updated_at || new Date().toISOString(),
          isContact: false,
        });
      }
    }

    // Sort chronologically descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items: combined });
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
    const source = payload.source || payload.lead_source || '';
    const notes = payload.notes || '';

    // 1. Create in Contact collection (Single source of truth for Web CRM)
    const contactDoc = await contactModel.create({
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
      contact_owner_email: req.user.email || '',
    }).catch(err => {
      console.error('[leadController] Error saving to Contact model:', err);
      return null;
    });

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
    }).catch(err => {
      console.error('[leadController] Error saving to Lead model:', err);
      return null;
    });

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

    res.json({
      message: 'Stage transitioned successfully',
      stage: targetStage,
      record: updatedContact || updatedLead
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

    const lead = await leadModel.findById(leadId).catch(() => null) || await contactModel.findById(leadId).catch(() => null);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const orgId = req.user.organization_id || req.user.organizationId;
    const leadName = lead.customer_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead';
    const phone = lead.phone || lead.contact_number || '';

    // 1. Create Account
    const account = await accountModel.create({
      name: `${leadName} Account`,
      phone: phone,
      organization_id: orgId,
      created_by: req.user._id || req.user.id
    });

    // 2. Create Contact
    const contact = await contactModel.create({
      customer_name: leadName,
      contact_number: phone,
      email_id: lead.email || lead.email_id || '',
      organization_id: orgId,
      created_by: req.user._id || req.user.id,
      account_id: account._id,
      stage: 'CONVERTED'
    });

    // 3. Mark Lead as converted
    await Promise.all([
      leadModel.findByIdAndUpdate(leadId, { $set: { lead_status: 'CONVERTED', stage: 'CONVERTED' } }).catch(() => null),
      contactModel.findByIdAndUpdate(leadId, { $set: { stage: 'CONVERTED' } }).catch(() => null)
    ]);

    res.json({
      message: 'Lead converted successfully',
      account,
      contact
    });
  } catch (err) {
    next(err);
  }
};
