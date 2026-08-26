const mongoose = require('mongoose');
require('./industryModel');

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
  resource_property_types: 'propertyTypes',
  resource_property_sub_types: 'propertySubTypes',
  resource_budgets: 'budgets',
  resource_locations: 'locations',
  resource_lead_sources: 'leadSources',
  resource_transfer_reasons: 'transferReasons',
  resource_property_stages: 'propertyStages',
  resource_carousel: 'carousel',
  resource_projects: 'projects',
  resource_property_statuses: 'propertyStatuses',
  resource_notes: 'notes',
};

const RESOURCE_FIELDS = [
  'propertyTypes', 'property_types',
  'propertySubTypes', 'property_sub_types',
  'budgets',
  'locations',
  'leadSources', 'lead_sources',
  'transferReasons', 'transfer_reasons',
  'propertyStages', 'property_stages',
  'carousel',
  'projects',
  'propertyStatuses', 'property_statuses',
  'notes',
];

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
    const Industry = mongoose.model('Industry');
    if (mongoose.Types.ObjectId.isValid(industryId)) {
      resolvedIndustryObjectId = String(industryId);
      try {
        const ind = await Industry.findById(industryId).exec();
        if (ind) resolvedIndustryCode = ind.code;
      } catch (e) {}
    } else {
      resolvedIndustryCode = String(industryId);
      try {
        const ind = await Industry.findOne({
          $or: [
            { code: String(industryId).toLowerCase() },
            { code: String(industryId).toUpperCase() },
            { code: String(industryId) }
          ]
        }).exec();
        if (ind) resolvedIndustryObjectId = String(ind._id);
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
  const targetOrgId = (organizationId === 'null' || !organizationId || organizationId === 'all') ? null : organizationId;
  const primaryFieldName = getFieldName(resource_key);
  const candidateFields = [primaryFieldName];
  if (primaryFieldName === 'propertyStages') candidateFields.push('property_stages');
  if (primaryFieldName === 'propertyTypes') candidateFields.push('property_types');
  if (primaryFieldName === 'propertySubTypes') candidateFields.push('property_sub_types');
  if (primaryFieldName === 'leadSources') candidateFields.push('lead_sources');
  if (primaryFieldName === 'transferReasons') candidateFields.push('transfer_reasons');
  if (primaryFieldName === 'propertyStatuses') candidateFields.push('property_statuses');

  let orgItems = [];
  let masterItems = [];

  // 1. Fetch organization-specific resources if targetOrgId is provided
  if (targetOrgId !== null && targetOrgId !== '') {
    const orgDocs = await OrganizationResources.find({ organization_id: targetOrgId }).exec();
    orgDocs.forEach(d => {
      for (const f of candidateFields) {
        if (Array.isArray(d[f])) {
          d[f].forEach(item => {
            orgItems.push({
              ...item,
              organizationId: targetOrgId,
              organization_id: targetOrgId,
              isMaster: false
            });
          });
        }
      }
    });
  }

  // 2. Fetch industry master resources (where organization_id is null)
  let masterQuery = { organization_id: null };
  if (indMatchConditions.length > 0) {
    masterQuery.industry_id = { $in: indMatchConditions };
  }
  const masterDocs = await OrganizationResources.find(masterQuery).exec();
  masterDocs.forEach(d => {
    for (const f of candidateFields) {
      if (Array.isArray(d[f])) {
        d[f].forEach(item => {
          masterItems.push({
            ...item,
            organizationId: null,
            organization_id: null,
            isMaster: true
          });
        });
      }
    }
  });

  // If SuperAdmin explicitly requested ONLY master data (targetOrgId === null && !all)
  let items = [];
  if (targetOrgId === null && !all) {
    items = masterItems;
  } else if (all) {
    const allDocs = await OrganizationResources.find({}).exec();
    allDocs.forEach(d => {
      for (const f of candidateFields) {
        if (Array.isArray(d[f])) {
          d[f].forEach(item => {
            items.push({
              ...item,
              organizationId: d.organization_id || null,
              organization_id: d.organization_id || null,
              isMaster: !d.organization_id
            });
          });
        }
      }
    });
  } else {
    // MERGE: Organization Custom Items + Industry Master Items
    // Org items take precedence over matching master items
    items = [...orgItems, ...masterItems];
  }

  if (workspaceId) {
    items = items.filter(item => !item.workspaceId && !item.workspace_id || String(item.workspaceId || item.workspace_id) === String(workspaceId) || item.isMaster);
  }

  // Deduplicate items by identifier while prioritizing org-specific items
  const seen = new Set();
  const uniqueItems = [];
  for (const item of items) {
    const keyVal = (item.value || item.locationName || item.location || item.propertyType || item.propertySubType || item.property_sub_type || item.stage || item.reason || item.leadSource || item.budget || item.name || item.id || item._id || '').toString().trim().toLowerCase();
    const uniqueKey = keyVal ? `${primaryFieldName}:${keyVal}` : String(item.id || item._id);
    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueItems.push(item);
    }
  }

  return uniqueItems.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return db - da;
  });
};

exports.findById = async (id) => {
  if (!id) return null;
  const strId = String(id);

  const docs = await OrganizationResources.find({}).exec();
  for (const doc of docs) {
    for (const field of RESOURCE_FIELDS) {
      const arr = doc[field] || (doc.get && doc.get(field));
      if (Array.isArray(arr)) {
        const item = arr.find(i => String(i.id) === strId || String(i._id) === strId || (i.leadSourceId && String(i.leadSourceId) === strId));
        if (item) {
          return {
            ...item,
            organizationId: doc.organization_id || doc.organizationId,
            organization_id: doc.organization_id || doc.organizationId,
            workspaceId: item.workspaceId || item.workspace_id || doc.workspaceId || null,
          };
        }
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
      const ind = await Industry.findOne({
        $or: [
          { code: String(industryId).toLowerCase() },
          { code: String(industryId).toUpperCase() },
          { code: String(industryId) }
        ]
      }).exec();
      if (ind) resolvedIndustryId = ind._id.toString();
    }
  }

  const cleanOrgId = (organizationId === 'null' || !organizationId || organizationId === 'all') ? null : organizationId;
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
    _id: itemId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (resource_key === 'resource_lead_sources' || resource_key === 'resourceLeadSources') {
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
  if (!id) return null;
  const strId = String(id);
  let updatedItem = null;

  const docs = await OrganizationResources.find({}).exec();
  for (const doc of docs) {
    let modified = false;
    for (const field of RESOURCE_FIELDS) {
      if (Array.isArray(doc[field])) {
        const idx = doc[field].findIndex(i => String(i.id) === strId || String(i._id) === strId || (i.leadSourceId && String(i.leadSourceId) === strId));
        if (idx !== -1) {
          const updatePayload = { ...data };
          if (field === 'leadSources' || field === 'lead_sources') {
            updatePayload.leadSourceId = doc[field][idx].leadSourceId || id;
          }
          doc[field][idx] = {
            ...doc[field][idx],
            ...updatePayload,
            updatedAt: new Date(),
          };
          updatedItem = doc[field][idx];
          doc.markModified(field);
          modified = true;
        }
      }
    }
    if (modified) {
      await doc.save();
    }
  }
  return updatedItem;
};

exports.remove = async (id) => {
  if (!id) return null;
  const strId = String(id);
  let removedItem = null;

  const docs = await OrganizationResources.find({}).exec();
  for (const doc of docs) {
    let modified = false;
    for (const field of RESOURCE_FIELDS) {
      if (Array.isArray(doc[field])) {
        const idx = doc[field].findIndex(i => String(i.id) === strId || String(i._id) === strId || (i.leadSourceId && String(i.leadSourceId) === strId));
        if (idx !== -1) {
          removedItem = doc[field][idx];
          doc[field].splice(idx, 1);
          doc.markModified(field);
          modified = true;
        }
      }
    }
    if (modified) {
      await doc.save();
    }
  }
  return removedItem;
};
