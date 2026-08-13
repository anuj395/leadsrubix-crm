const mongoose = require('mongoose');

const KEY_MAP = {
  resourcePropertyTypes: 'propertyTypes',
  resourcePropertySubTypes: 'propertySubTypes',
  resourceBudgets: 'budgets',
  resourceLocations: 'locations',
  resourceLeadSources: 'leadSources',
  resourceTransferReasons: 'transferReasons',
  resourcePropertyStages: 'propertyStages',
  resourceCarousel: 'carousel',
  resourceProjects: 'projects',
  resourcePropertyStatus: 'propertyStatuses',
  resourceNotes: 'notes',
};

function getFieldName(resourceKey) {
  return KEY_MAP[resourceKey] || resourceKey;
}

const organizationResourcesSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', default: null, index: true, alias: 'industryId' },
    property_stages: { type: Array, default: [], alias: 'propertyStages' },
    property_sub_types: { type: Array, default: [], alias: 'propertySubTypes' },
    property_types: { type: Array, default: [], alias: 'propertyTypes' },
    transfer_reasons: { type: Array, default: [], alias: 'transferReasons' },
    budgets: { type: Array, default: [] },
    carousel: { type: Array, default: [] },
    lead_sources: { type: Array, default: [], alias: 'leadSources' },
    locations: { type: Array, default: [] },
    projects: { type: Array, default: [] },
    property_statuses: { type: Array, default: [], alias: 'propertyStatuses' },
    notes: { type: Array, default: [] },
  },
  { 
    timestamps: true, strict: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const OrganizationResources = mongoose.model('OrganizationResources', organizationResourcesSchema, 'resource_items');

exports.ResourceItem = OrganizationResources;

exports.list = async ({ organizationId, industryId, workspaceId, resource_key, all = false } = {}) => {
  if ((resource_key === 'resource_projects' || resource_key === 'resourceProjects') && all) {
    const docs = await OrganizationResources.find({}).exec();
    const allProjects = [];
    const Organization = mongoose.model('Organization');
    const orgs = await Organization.find({}).exec();
    const orgMap = {};
    orgs.forEach(o => {
      const oid = o.organization_id || o.organizationId || o._id.toString();
      orgMap[oid] = o.organization_name || o.name || o.organizationName || '';
    });

    docs.forEach(doc => {
      const orgId = doc.organization_id;
      const orgName = orgMap[orgId] || '';
      if (Array.isArray(doc.projects)) {
        doc.projects.forEach(p => {
          allProjects.push({
            organizationId: orgId,
            organizationName: orgName,
            ...p,
          });
        });
      }
    });

    return allProjects.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db - da;
    });
  }

  const targetOrgId = (organizationId === 'null' || !organizationId) ? null : organizationId;
  let query = { organization_id: targetOrgId };
  if (targetOrgId === null && industryId) {
    if (mongoose.Types.ObjectId.isValid(industryId)) {
      query.industry_id = industryId;
    } else {
      const Industry = mongoose.model('Industry');
      const ind = await Industry.findOne({ code: industryId }).exec();
      if (ind) query.industry_id = ind._id;
    }
  }
  let doc = await OrganizationResources.findOne(query).exec();
  // Fallback to global defaults if no custom organization resources document exists yet
  if (!doc && targetOrgId !== null && targetOrgId !== '') {
    let fallbackQuery = { organization_id: null };
    if (industryId) {
      if (mongoose.Types.ObjectId.isValid(industryId)) {
        fallbackQuery.industry_id = industryId;
      } else {
        const Industry = mongoose.model('Industry');
        const ind = await Industry.findOne({ code: industryId }).exec();
        if (ind) fallbackQuery.industry_id = ind._id;
      }
    }
    doc = await OrganizationResources.findOne(fallbackQuery).exec();
  }
  if (!doc) return [];
  const fieldName = getFieldName(resource_key);
  let items = doc[fieldName] || [];

  if (workspaceId) {
    items = items.filter(item => !item.workspaceId && !item.workspace_id || String(item.workspaceId || item.workspace_id) === String(workspaceId));
  }

  // Sort by createdAt descending (matching old behavior)
  return [...items].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return db - da;
  });
};

exports.findById = async (id) => {
  const doc = await OrganizationResources.findOne({
    $or: Object.values(KEY_MAP).map(field => ({ [`${field}.id`]: id }))
  }).exec();

  if (!doc) return null;
  for (const field of Object.values(KEY_MAP)) {
    if (doc[field]) {
      const item = doc[field].find(i => String(i.id) === String(id));
      if (item) {
        return {
          ...item,
          organizationId: doc.organization_id,
        };
      }
    }
  }
  return null;
};

exports.create = async ({ organizationId, industryId, resource_key, data }) => {
  let query = { organization_id: organizationId };
  if (organizationId === null && industryId) {
    if (mongoose.Types.ObjectId.isValid(industryId)) {
      query.industry_id = industryId;
    } else {
      const Industry = mongoose.model('Industry');
      const ind = await Industry.findOne({ code: industryId }).exec();
      if (ind) query.industry_id = ind._id;
    }
  }
  let doc = await OrganizationResources.findOne(query).exec();
  if (!doc) {
    doc = new OrganizationResources({ organization_id: organizationId });
  }

  let resolvedIndustryId = industryId;
  if (!doc.industry_id || !mongoose.Types.ObjectId.isValid(doc.industry_id.toString()) || doc.industry_id.toString().startsWith('temp')) {
    if (organizationId && organizationId !== 'null') {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ organization_id: organizationId }).exec();
      if (org) {
        const orgIndustry = org.industry_id || org.industryId;
        if (orgIndustry) {
          const Industry = mongoose.model('Industry');
          const ind = await Industry.findOne({ code: orgIndustry }).exec();
          if (ind) {
            resolvedIndustryId = ind._id;
          }
        }
      }
    }

    if (resolvedIndustryId) {
      if (!mongoose.Types.ObjectId.isValid(resolvedIndustryId.toString())) {
        const Industry = mongoose.model('Industry');
        const ind = await Industry.findOne({ code: resolvedIndustryId }).exec();
        if (ind) resolvedIndustryId = ind._id;
      }
    }

    if (resolvedIndustryId && mongoose.Types.ObjectId.isValid(resolvedIndustryId.toString())) {
      doc.industry_id = resolvedIndustryId;
    }
  }

  const itemId = new mongoose.Types.ObjectId().toString();
  const fieldName = getFieldName(resource_key);

  const newItem = {
    id: itemId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (resource_key === 'resource_lead_sources') {
    newItem.leadSourceId = itemId;
  }

  if (!doc[fieldName]) {
    doc[fieldName] = [];
  }
  doc[fieldName].push(newItem);
  doc.markModified(fieldName);
  await doc.save();

  return newItem;
};

exports.update = async (id, data) => {
  const doc = await OrganizationResources.findOne({
    $or: Object.values(KEY_MAP).map(field => ({ [`${field}.id`]: id }))
  }).exec();

  if (!doc) return null;

  for (const field of Object.values(KEY_MAP)) {
    if (doc[field]) {
      const idx = doc[field].findIndex(i => String(i.id) === String(id));
      if (idx !== -1) {
        const updatePayload = { ...data };
        if (field === 'leadSources') {
          updatePayload.leadSourceId = id;
        }
        doc[field][idx] = {
          ...doc[field][idx],
          ...updatePayload,
          updatedAt: new Date(),
        };
        doc.markModified(field);
        await doc.save();
        return doc[field][idx];
      }
    }
  }
  return null;
};

exports.remove = async (id) => {
  const doc = await OrganizationResources.findOne({
    $or: Object.values(KEY_MAP).map(field => ({ [`${field}.id`]: id }))
  }).exec();

  if (!doc) return null;

  for (const field of Object.values(KEY_MAP)) {
    if (doc[field]) {
      const idx = doc[field].findIndex(i => String(i.id) === String(id));
      if (idx !== -1) {
        const removed = doc[field][idx];
        doc[field].splice(idx, 1);
        doc.markModified(field);
        await doc.save();
        return removed;
      }
    }
  }
  return null;
};
