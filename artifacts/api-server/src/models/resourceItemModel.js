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
    industry_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true, alias: 'industryId' },
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
  const isProjects = resource_key === 'resource_projects' || resource_key === 'resourceProjects';

  let resolvedIndustryObjectId = null;
  let resolvedIndustryCode = null;
  if (industryId) {
    if (mongoose.Types.ObjectId.isValid(industryId)) {
      resolvedIndustryObjectId = industryId;
      try {
        const Industry = mongoose.model('Industry');
        const ind = await Industry.findById(industryId).exec();
        if (ind) resolvedIndustryCode = ind.code;
      } catch (e) {}
    } else {
      resolvedIndustryCode = String(industryId);
      try {
        const Industry = mongoose.model('Industry');
        const ind = await Industry.findOne({ code: String(industryId).toLowerCase() }).exec();
        if (ind) resolvedIndustryObjectId = ind._id;
      } catch (e) {}
    }
  }

  const indMatchConditions = [];
  if (resolvedIndustryObjectId) indMatchConditions.push(resolvedIndustryObjectId);
  if (resolvedIndustryCode) {
    indMatchConditions.push(resolvedIndustryCode);
    indMatchConditions.push(resolvedIndustryCode.toUpperCase());
    indMatchConditions.push(resolvedIndustryCode.toLowerCase());
  }

  if (isProjects) {
    const Organization = mongoose.model('Organization');
    const orgs = await Organization.find({}).exec();
    const orgMap = {};
    orgs.forEach(o => {
      const oid = o.organization_id || o.organizationId || o._id.toString();
      orgMap[oid] = o.organization_name || o.name || o.organizationName || '';
    });

    const targetOrgId = (organizationId === 'null' || !organizationId || organizationId === 'all') ? null : organizationId;

    if (!targetOrgId || all) {
      const query = { organization_id: { $ne: null } };
      if (indMatchConditions.length > 0) {
        query.industry_id = { $in: indMatchConditions };
      }
      const docs = await OrganizationResources.find(query).exec();
      const allProjects = [];
      docs.forEach(doc => {
        const docOrgId = doc.organization_id;
        const orgName = orgMap[docOrgId] || '';
        if (Array.isArray(doc.projects)) {
          doc.projects.forEach(p => {
            if (p && (p.projectName || p.project_name || p.developerName || p.developer_name || p.id)) {
              allProjects.push({
                organizationId: docOrgId,
                organizationName: orgName,
                ...p,
              });
            }
          });
        }
      });

      return allProjects.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return db - da;
      });
    }

    // Specific organization requested
    let query = { organization_id: targetOrgId };
    let docs = await OrganizationResources.find(query).exec();
    let items = [];
    docs.forEach(doc => {
      if (Array.isArray(doc.projects)) {
        doc.projects.forEach(p => {
          items.push({
            organizationId: targetOrgId,
            organizationName: orgMap[targetOrgId] || '',
            ...p,
          });
        });
      }
    });

    if (workspaceId) {
      items = items.filter(item => !item.workspaceId && !item.workspace_id || String(item.workspaceId || item.workspace_id) === String(workspaceId));
    }

    return items.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db - da;
    });
  }

  // Generic static options (budgets, locations, lead sources, stages, types, carousel, etc.)
  const targetOrgId = (organizationId === 'null' || !organizationId) ? null : organizationId;
  let query = { organization_id: targetOrgId };
  if (targetOrgId === null && indMatchConditions.length > 0) {
    query.industry_id = { $in: indMatchConditions };
  }
  let docs = await OrganizationResources.find(query).exec();
  if (docs.length === 0 && targetOrgId !== null && targetOrgId !== '') {
    let fallbackQuery = { organization_id: null };
    if (indMatchConditions.length > 0) {
      fallbackQuery.industry_id = { $in: indMatchConditions };
    }
    docs = await OrganizationResources.find(fallbackQuery).exec();
  }

  const fieldName = getFieldName(resource_key);
  let items = [];
  docs.forEach(d => {
    if (Array.isArray(d[fieldName])) {
      items.push(...d[fieldName]);
    }
  });

  if (items.length === 0 && targetOrgId !== null && targetOrgId !== '') {
    let fallbackQuery = { organization_id: null };
    if (indMatchConditions.length > 0) {
      fallbackQuery.industry_id = { $in: indMatchConditions };
    }
    const fallbackDocs = await OrganizationResources.find(fallbackQuery).exec();
    fallbackDocs.forEach(d => {
      if (Array.isArray(d[fieldName])) {
        items.push(...d[fieldName]);
      }
    });
  }

  if (workspaceId) {
    items = items.filter(item => !item.workspaceId && !item.workspace_id || String(item.workspaceId || item.workspace_id) === String(workspaceId));
  }

  // Deduplicate items by id
  const seen = new Set();
  const uniqueItems = items.filter(item => {
    const itemId = item.id || item._id || item.name || item.location || item.budget;
    if (!itemId || seen.has(String(itemId))) return false;
    seen.add(String(itemId));
    return true;
  });

  return uniqueItems.sort((a, b) => {
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
  let resolvedIndustryId = industryId;
  if (industryId) {
    if (!mongoose.Types.ObjectId.isValid(industryId.toString())) {
      const Industry = mongoose.model('Industry');
      const ind = await Industry.findOne({ code: String(industryId).toLowerCase() }).exec();
      if (ind) resolvedIndustryId = ind._id;
    }
  }

  const cleanOrgId = (organizationId === 'null' || !organizationId) ? null : organizationId;
  let query = { organization_id: cleanOrgId };
  if (cleanOrgId === null && resolvedIndustryId) {
    query.industry_id = resolvedIndustryId;
  }
  let doc = await OrganizationResources.findOne(query).exec();
  if (!doc) {
    doc = new OrganizationResources({
      organization_id: cleanOrgId,
      industry_id: resolvedIndustryId,
    });
  } else if (!doc.industry_id && resolvedIndustryId) {
    doc.industry_id = resolvedIndustryId;
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
