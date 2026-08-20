const leadModel = require('../models/leadModel');
const { mapWithDualCase } = require('../utils/caseConverter');

exports.list = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const filter = { organization_id: orgId };
    const items = await leadModel.list({ filter });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const payload = {
      ...req.body,
      organization_id: orgId,
      created_by: req.user._id || req.user.id
    };
    const item = await leadModel.create(payload);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await leadModel.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await leadModel.remove(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.retrieve = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await leadModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Lead not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

const accountModel = require('../models/accountModel');
const contactModel = require('../models/contactModel');

exports.convert = async (req, res, next) => {
  try {
    const leadId = req.body.leadId || req.body.lead_id;
    if (!leadId) return res.status(400).json({ message: 'leadId is required' });

    const lead = await leadModel.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const orgId = req.user.organization_id || req.user.organizationId;

    // 1. Create Account
    const companyName = lead.company_name || `${lead.first_name} ${lead.last_name || ''} Company`.trim();
    const account = await accountModel.create({
      name: companyName,
      phone: lead.phone,
      organization_id: orgId,
      created_by: req.user._id || req.user.id
    });

    // 2. Create Contact
    const contact = await contactModel.create({
      customer_name: `${lead.first_name} ${lead.last_name || ''}`.trim(),
      contact_number: lead.phone,
      email_id: lead.email,
      organization_id: orgId,
      created_by: req.user._id || req.user.id,
      account_id: account._id
    });

    // 3. Mark Lead as converted
    await leadModel.findByIdAndUpdate(leadId, { $set: { lead_status: 'CONVERTED' } });

    res.json({
      message: 'Lead converted successfully',
      account,
      contact
    });
  } catch (err) {
    next(err);
  }
};
