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
    organizationId: { type: String, default: null, index: true },
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', default: null, index: true },
    propertyStages: { type: Array, default: [] },
    propertySubTypes: { type: Array, default: [] },
    propertyTypes: { type: Array, default: [] },
    transferReasons: { type: Array, default: [] },
    budgets: { type: Array, default: [] },
    carousel: { type: Array, default: [] },
    leadSources: { type: Array, default: [] },
    locations: { type: Array, default: [] },
    projects: { type: Array, default: [] },
    propertyStatuses: { type: Array, default: [] },
    notes: { type: Array, default: [] },
  },
  { timestamps: true, strict: false }
);

const OrganizationResources = mongoose.model('OrganizationResources', organizationResourcesSchema, 'resource_items');

exports.ResourceItem = OrganizationResources;

exports.list = async ({ organizationId, industryId, resource_key, all = false } = {}) => {
  if ((resource_key === 'resource_projects' || resource_key === 'resourceProjects') && all) {
    const docs = await OrganizationResources.find({}).lean().exec();
    const allProjects = [];
    const Organization = mongoose.model('Organization');
    const orgs = await Organization.find({}).lean().exec();
    const orgMap = {};
    orgs.forEach(o => {
      const oid = o.organizationId || o.organizationId || o._id.toString();
      orgMap[oid] = o.organizationName || o.name || o.organizationName || '';
    });

    docs.forEach(doc => {
      const orgId = doc.organizationId;
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
  let query = { organizationId: targetOrgId };
  if (targetOrgId === null && industryId) {
    query.industryId = industryId;
  }
  let doc = await OrganizationResources.findOne(query).lean().exec();
  // Fallback to global defaults if no custom organization resources document exists yet
  if (!doc && targetOrgId !== null && targetOrgId !== '') {
    let fallbackQuery = { organizationId: null };
    if (industryId) fallbackQuery.industryId = industryId;
    doc = await OrganizationResources.findOne(fallbackQuery).lean().exec();
  }
  if (!doc) return [];
  const fieldName = getFieldName(resource_key);
  const items = doc[fieldName] || [];
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
  }).lean().exec();

  if (!doc) return null;
  for (const field of Object.values(KEY_MAP)) {
    if (doc[field]) {
      const item = doc[field].find(i => String(i.id) === String(id));
      if (item) {
        return {
          ...item,
          organizationId: doc.organizationId,
        };
      }
    }
  }
  return null;
};

exports.create = async ({ organizationId, industryId, resource_key, data }) => {
  let query = { organizationId };
  if (organizationId === null && industryId) {
    query.industryId = industryId;
  }
  let doc = await OrganizationResources.findOne(query).exec();
  if (!doc) {
    doc = new OrganizationResources({ organizationId });
  }

  let resolvedIndustryId = industryId;
  if (!doc.industryId || !mongoose.Types.ObjectId.isValid(doc.industryId.toString()) || doc.industryId.toString().startsWith('temp')) {
    if (organizationId && organizationId !== 'null') {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ organizationId }).lean().exec();
      if (org) {
        const orgIndustry = org.industryId || org.industryId;
        if (orgIndustry) {
          const Industry = mongoose.model('Industry');
          const ind = await Industry.findOne({ code: orgIndustry }).lean().exec();
          if (ind) {
            resolvedIndustryId = ind._id;
          }
        }
      }
    }

    if (resolvedIndustryId) {
      if (!mongoose.Types.ObjectId.isValid(resolvedIndustryId.toString())) {
        const Industry = mongoose.model('Industry');
        const ind = await Industry.findOne({ code: resolvedIndustryId }).lean().exec();
        if (ind) resolvedIndustryId = ind._id;
      }
    }

    if (resolvedIndustryId && mongoose.Types.ObjectId.isValid(resolvedIndustryId.toString())) {
      doc.industryId = resolvedIndustryId;
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
