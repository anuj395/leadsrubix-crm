const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { countryNames } = require('../utils/countries');
const resourceItemModel = require('../models/resourceItemModel');

const router = express.Router();

async function resolveTenantList(Model, arrayKey, targetIndustry, targetOrganization) {
  let query = {};
  if (targetOrganization) {
    query.organization_id = targetOrganization;
  } else {
    query.$or = [{ organization_id: null }, { organization_id: { $exists: false } }];
  }
  if (targetIndustry) {
    const Industry = mongoose.model('Industry');
    const ind = await Industry.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(targetIndustry) ? targetIndustry : null }, { code: targetIndustry }] }).lean().exec();
    if (ind) {
      query.industry_id = { $in: [String(ind._id), ind.code] };
    } else {
      query.industry_id = targetIndustry;
    }
  }
  
  let doc = await Model.findOne(query).lean().exec();
  const raw = doc ? doc[arrayKey] || [] : [];
  return raw.filter(item => item.isActive !== false && item.is_active !== false);
}

/**
 * Demo dropdown sources for the dynamic-form system.
 * Real deployments will replace these with project-specific endpoints; the
 * frontend only cares about the response shape: an array of `{ value, label }`
 * (or plain strings, which the form treats as `value === label`).
 */
const SOURCES = {
  'leadType': [
    { value: 'Data',  label: 'Data' },
    { value: 'Leads', label: 'Leads' },
  ],
  'departments': [
    { value: 'sales',       label: 'Sales' },
    { value: 'marketing',   label: 'Marketing' },
    { value: 'support',     label: 'Customer Support' },
    { value: 'operations',  label: 'Operations' },
    { value: 'finance',     label: 'Finance' },
    { value: 'engineering', label: 'Engineering' },
  ],
};

const STATES_BY_COUNTRY = {
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi'
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming'
  ]
};

router.get('/:key', (req, res, next) => {
  const { key } = req.params;
  const publicKeys = ['countries', 'states', 'industries', 'country_codes'];
  if (publicKeys.includes(key)) {
    return next();
  }
  return authenticate(req, res, next);
}, async (req, res) => {
  const { key } = req.params;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  if (key === 'countries') {
    try {
      const DropdownOption = mongoose.model('DropdownOption');
      const list = await DropdownOption.find({ key: 'countries' }).lean().exec();
      if (list && list.length > 0) {
        return res.json({ items: list.map(item => ({ value: item.value, label: item.label })) });
      }
    } catch (err) {
      console.error('Failed to load DB-driven countries', err);
    }
    return res.json({ items: countryNames });
  }
  
  if (key === 'states') {
    const country = req.query.country || 'India';
    try {
      const DropdownOption = mongoose.model('DropdownOption');
      const list = await DropdownOption.find({ key: `states_${country}` }).lean().exec();
      if (list && list.length > 0) {
        return res.json({ items: list.map(item => ({ value: item.value, label: item.label })) });
      }
    } catch (err) {
      console.error('Failed to load DB-driven states', err);
    }
    const list = STATES_BY_COUNTRY[country] || STATES_BY_COUNTRY['India'];
    const options = list.map(s => ({ value: s, label: s }));
    return res.json({ items: options });
  }
  
  if (key === 'industries') {
    try {
      const Industry = mongoose.model('Industry');
      const query = {};
      if (req.query.launchedOnly === 'true') {
        query.is_active = true;
        query.status = 'Launched';
      }
      const list = await Industry.find(query).sort({ name: 1 }).lean().exec();
      const options = list.map(ind => ({ value: ind.code, label: ind.name }));
      return res.json({ items: options });
    } catch (err) {
      return res.status(500).json({ message: 'Failed to fetch industries' });
    }
  }

  if (key === 'organizations') {
    if (req.user?.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Forbidden: Super Admin only' });
    }
    try {
      const Organization = mongoose.model('Organization');
      const targetIndustry = req.query.industryId || req.query.industry_code;
      let query = {};
      if (targetIndustry) {
        query.$or = [
          { industry_id: targetIndustry },
          { industryId: targetIndustry }
        ];
      }
      const list = await Organization.find(query).sort({ organization_name: 1 }).lean().exec();
      const options = list.map(org => ({
        value: String(org.organization_id || org.organizationId || org._id),
        label: org.organization_name || org.organizationName || org.name
      }));
      return res.json({ items: options });
    } catch (err) {
      return res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  }

  if (key === 'country_codes') {
    try {
      const DropdownOption = mongoose.model('DropdownOption');
      const list = await DropdownOption.find({ key: 'country_codes' }).lean().exec();
      if (list && list.length > 0) {
        return res.json({ items: list.map(item => ({ value: item.value, label: item.label })) });
      }
    } catch (err) {
      console.error('Failed to load DB-driven country codes', err);
    }
    const COUNTRY_CODES = [
      { value: '+91', label: '🇮🇳 India (+91)' },
      { value: '+1', label: '🇺🇸 United States (+1)' },
      { value: '+44', label: '🇬🇧 United Kingdom (+44)' },
      { value: '+971', label: '🇦🇪 UAE (+971)' },
      { value: '+65', label: '🇸🇬 Singapore (+65)' },
      { value: '+61', label: '🇦🇺 Australia (+61)' },
      { value: '+1', label: '🇨🇦 Canada (+1)' },
      { value: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
      { value: '+974', label: '🇶🇦 Qatar (+974)' },
      { value: '+965', label: '🇰🇼 Kuwait (+965)' },
      { value: '+968', label: '🇴🇲 Oman (+968)' },
      { value: '+973', label: '🇧🇭 Bahrain (+973)' },
    ];
    return res.json({ items: COUNTRY_CODES });
  }

  if (key === 'organizationUsers') {
    try {
      const User = mongoose.model('User');
      const orgId = req.user?.role === 'superAdmin'
        ? (req.query.organizationId || req.user?.organizationId || req.user?.organization_id)
        : (req.user?.organizationId || req.user?.organization_id);
      const query = {};
      if (req.user?.role !== 'superAdmin') {
        query.organization_id = orgId || 'non-existent-org-id';
      } else if (orgId) {
        query.organization_id = orgId;
      }
      const usersList = await User.find(query).select('email').lean().exec();
      const options = usersList.map(u => ({ value: u.email, label: u.email }));
      return res.json({ items: options });
    } catch (err) {
      console.error('Failed to load organization users', err);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
  }

  const keyMap = {
    projectName: 'resourceProjects',
    propertyType: 'resourcePropertyTypes',
    propertyStage: 'resourcePropertyStages',
    budget: 'resourceBudgets',
    propertySubType: 'resourcePropertySubTypes',
    source: 'resourceLeadSources',
    location: 'resourceLocations',
  };
  const targetKey = keyMap[key] || key;

  if (targetKey.startsWith('resource_') || targetKey.startsWith('resource')) {
    try {
      let orgId = null;
      let resolvedIndustryId = null;
      if (req.user.role === 'superAdmin') {
        orgId = req.query.organizationId || req.query.organizationId;
        if (orgId === 'null' || orgId === '') orgId = null;

        const targetInd = req.query.industryId || req.query.industryId || req.query.industry_code || req.body.industryId || req.body.industryId || req.body.industry_code;
        if (targetInd) {
          const Industry = mongoose.model('Industry');
          let ind = await Industry.findOne({ code: targetInd }).lean().exec();
          if (ind) {
            resolvedIndustryId = ind._id;
          } else if (mongoose.Types.ObjectId.isValid(targetInd)) {
            ind = await Industry.findById(targetInd).lean().exec();
            if (ind) resolvedIndustryId = ind._id;
          }
        }
      } else {
        orgId = req.user.organizationId || req.user.organization_id;
        if (req.user.industryId) {
          const Industry = mongoose.model('Industry');
          const ind = await Industry.findOne({ code: req.user.industryId }).lean().exec();
          if (ind) resolvedIndustryId = ind._id;
        }
      }

      const list = await resourceItemModel.list({
        organizationId: orgId,
        industryId: resolvedIndustryId,
        resource_key: targetKey,
      });

      let displayField = req.query.display;
      if (!displayField) {
        const keyLower = targetKey.toLowerCase();
        if (keyLower.includes('propertytype')) {
          displayField = 'propertyType';
        } else if (keyLower.includes('propertystage') || keyLower.includes('stage')) {
          displayField = 'stage';
        } else if (keyLower.includes('leadsource')) {
          displayField = 'leadSource';
        } else if (keyLower.includes('location')) {
          displayField = 'locationName';
        } else if (keyLower.includes('budget')) {
          displayField = 'budget';
        } else if (keyLower.includes('propertysubtype')) {
          displayField = 'propertySubType';
        } else if (keyLower.includes('project')) {
          displayField = 'projectName';
        } else {
          displayField = 'name';
        }
      }
      const toCamelCase = (str) => str.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
      const displayFieldCamel = toCamelCase(displayField);

      const options = list.map(item => {
        const val = item[displayField] || item[displayFieldCamel] || item.name || item.value || Object.values(item).filter(v => typeof v !== 'object')[0] || item.id;
        return { value: String(val || ''), label: String(val || '') };
      });

      return res.json({ items: options });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch resource options' });
    }
  }

  if (key === 'propertyStatus') {
    try {
      const list = await mongoose.connection.db.collection('property_statuses').find({}).toArray();
      if (list && list.length > 0) {
        return res.json({
          items: list.map(item => ({
            value: item.name || item.value,
            label: item.name || item.value
          }))
        });
      }
    } catch (err) {
      console.error('Failed to load property status options from property_statuses collection', err);
    }
  }

  if (key === 'teams') {
    try {
      const Team = mongoose.model('Team');
      const targetIndustry = req.user?.role === 'superAdmin'
        ? (req.query.industryId || req.query.industry_code || req.body?.industryId || req.body?.industry_code || req.user?.industryId)
        : req.user?.industryId;
      
      const targetOrganization = req.user?.role === 'superAdmin'
        ? (req.query.organizationId || req.user?.organizationId || req.user?.organization_id)
        : (req.user?.organizationId || req.user?.organization_id);

      if (!targetIndustry && req.user?.role === 'superAdmin' && req.query.organizationId) {
        const Organization = mongoose.model('Organization');
        const org = await Organization.findOne({
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(req.query.organizationId) ? req.query.organizationId : null },
            { organization_id: req.query.organizationId },
            { organizationId: req.query.organizationId }
          ]
        }).lean().exec();
        if (org) {
          targetIndustry = org.industryId;
        }
      }

      const list = await resolveTenantList(Team, 'teams', targetIndustry, targetOrganization);
      const options = list.map(t => ({ value: t.name, label: t.name }));
      return res.json({ items: options });
    } catch (err) {
      console.error('Failed to load teams', err);
      return res.status(500).json({ message: 'Failed to fetch teams' });
    }
  }

  if (key === 'branches') {
    try {
      const Branch = mongoose.model('Branch');
      const targetIndustry = req.user?.role === 'superAdmin'
        ? (req.query.industryId || req.query.industry_code || req.body?.industryId || req.body?.industry_code || req.user?.industryId)
        : req.user?.industryId;

      const targetOrganization = req.user?.role === 'superAdmin'
        ? (req.query.organizationId || req.user?.organizationId || req.user?.organization_id)
        : (req.user?.organizationId || req.user?.organization_id);

      if (!targetIndustry && req.user?.role === 'superAdmin' && req.query.organizationId) {
        const Organization = mongoose.model('Organization');
        const org = await Organization.findOne({
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(req.query.organizationId) ? req.query.organizationId : null },
            { organization_id: req.query.organizationId },
            { organizationId: req.query.organizationId }
          ]
        }).lean().exec();
        if (org) {
          targetIndustry = org.industryId;
        }
      }

      const list = await resolveTenantList(Branch, 'branches', targetIndustry, targetOrganization);
      const options = list.map(b => ({ value: b.name, label: b.name }));
      return res.json({ items: options });
    } catch (err) {
      console.error('Failed to load branches', err);
      return res.status(500).json({ message: 'Failed to fetch branches' });
    }
  }

  if (key === 'designations') {
    try {
      const Designation = mongoose.model('Designation');
      const targetIndustry = req.user?.role === 'superAdmin'
        ? (req.query.industryId || req.query.industry_code || req.body?.industryId || req.body?.industry_code || req.user?.industryId)
        : req.user?.industryId;

      const targetOrganization = req.user?.role === 'superAdmin'
        ? (req.query.organizationId || req.user?.organizationId || req.user?.organization_id)
        : (req.user?.organizationId || req.user?.organization_id);

      if (!targetIndustry && req.user?.role === 'superAdmin' && req.query.organizationId) {
        const Organization = mongoose.model('Organization');
        const org = await Organization.findOne({
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(req.query.organizationId) ? req.query.organizationId : null },
            { organizationId: req.query.organizationId }
          ]
        }).lean().exec();
        if (org) {
          targetIndustry = org.industryId;
        }
      }

      const list = await resolveTenantList(Designation, 'designations', targetIndustry, targetOrganization);
      return res.json({ items: (list || []).map(item => ({ value: item.value || item.name, label: item.label || item.name })) });
    } catch (err) {
      console.error('Failed to load designations option list', err);
      return res.status(500).json({ message: 'Failed to load designations' });
    }
  }

  try {
    const DropdownOption = mongoose.model('DropdownOption');
    const list = await DropdownOption.find({ key }).lean().exec();
    if (list && list.length > 0) {
      return res.json({ items: list.map(item => ({ value: item.value, label: item.label })) });
    }
  } catch (err) {
    console.error('Failed to load DB-driven dropdown options', err);
  }

  const data = SOURCES[key];
  if (!data) return res.status(404).json({ message: `Unknown options source "${key}"` });
  res.json({ items: data });
});

module.exports = router;
