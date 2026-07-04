require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm';
const ScreenSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ScreenFieldSchema = new mongoose.Schema({
  screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
  field_key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  options: { type: [String], default: [] },
  dropdown_source: { type: String, default: 'none' },
  dropdown_api: { type: String, default: '' },
  is_table_visible: { type: Boolean, default: true },
  is_form_visible: { type: Boolean, default: true },
  is_required: { type: Boolean, default: false },
  sortable: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ScreenPermissionSchema = new mongoose.Schema({
  screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  field_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ScreenField', required: true },
  is_enabled: { type: Boolean, default: true }
}, { timestamps: true });

const IndustrySchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const RoleSchema = new mongoose.Schema({
  industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ResourceItemSchema = new mongoose.Schema({
  industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  resource_key: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const Screen = mongoose.models.Screen || mongoose.model('Screen', ScreenSchema, 'screens');
const ScreenField = mongoose.models.ScreenField || mongoose.model('ScreenField', ScreenFieldSchema, 'screen_fields');
const ScreenPermission = mongoose.models.ScreenPermission || mongoose.model('ScreenPermission', ScreenPermissionSchema, 'screen_permissions');
const Industry = mongoose.models.Industry || mongoose.model('Industry', IndustrySchema, 'industries');
const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema, 'roles');
const ResourceItem = mongoose.models.ResourceItem || mongoose.model('ResourceItem', ResourceItemSchema, 'resource_items');

const RESOURCE_SCREENS = [
  {
    key: 'resourceCarousel',
    name: 'Carousel Banners',
    description: 'Banners shown on mobile/web dashboard carousel',
    fields: [
      { field_key: 'url', label: 'Image URL', type: 'image', is_required: true, order: 1 },
      { field_key: 'imageName', label: 'Image Name', type: 'text', is_required: true, order: 2 },
    ],
    items: [
      { url: 'https://via.placeholder.com/150', imageName: 'app_banner.png' },
    ]
  },
  {
    key: 'resourceLocations',
    name: 'Locations',
    description: 'Corporate and site branch locations',
    fields: [
      { field_key: 'locationName', label: 'Location Name', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { locationName: 'Noida' },
      { locationName: 'Delhi' },
    ]
  },
  {
    key: 'resourceLeadSources',
    name: 'Lead Sources',
    description: 'Marketing source channels',
    fields: [
      { field_key: 'leadSource', label: 'Lead Source Name', type: 'text', is_required: true, order: 1 },
      { field_key: 'leadSourceColor', label: 'Color Hex', type: 'text', is_required: false, order: 2 },
    ],
    items: [
      { leadSource: 'Sulekha', leadSourceColor: '#ff6b76' },
      { leadSource: 'Self Generated', leadSourceColor: '#22c55e' },
      { leadSource: 'OLX', leadSourceColor: '#3b82f6' },
    ]
  },
  {
    key: 'resourceBudgets',
    name: 'Budgets',
    description: 'Standard budget options',
    fields: [
      { field_key: 'budget', label: 'Budget Range', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { budget: 'Rs.40 Lacs - Rs.50 Lacs' },
      { budget: 'Rs.50 Lacs - Rs.60 Lacs' },
    ]
  },
  {
    key: 'resourceTransferReasons',
    name: 'Transfer Reasons',
    description: 'Reasons for transferring leads',
    fields: [
      { field_key: 'reason', label: 'Reason', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { reason: 'Fresh Leads' },
      { reason: 'Old Leads' },
    ]
  },
  {
    key: 'resourcePropertyStages',
    name: 'Property Stages',
    description: 'Construction stages',
    fields: [
      { field_key: 'stage', label: 'Stage Name', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { stage: 'Under Construction' },
      { stage: 'Ready to Move In' },
    ]
  },
  {
    key: 'resourcePropertyTypes',
    name: 'Property Types',
    description: 'Property categories',
    fields: [
      { field_key: 'propertyType', label: 'Property Type', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { propertyType: 'Residential Properties' },
      { propertyType: 'Commercial Properties' },
    ]
  },
  {
    key: 'resourcePropertySubTypes',
    name: 'Property Sub Types',
    description: 'Property subcategories',
    fields: [
      { field_key: 'propertyType', label: 'Property Type', type: 'select', dropdown_source: 'api', dropdown_api: '/api/options/resourcePropertyTypes?display=propertyType', is_required: true, order: 1 },
      { field_key: 'propertySubType', label: 'Property Sub Type', type: 'text', is_required: true, order: 2 },
    ],
    items: [
      { propertyType: 'Residential Properties', propertySubType: 'Apartments/Condos' },
      { propertyType: 'Commercial Properties', propertySubType: 'Office Spaces' },
    ]
  }
];
async function main() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  // Perform database migration to rename organizationId to organizationId in resource_items
  const db = mongoose.connection.db;
  const collection = db.collection('resource_items');

  // Clear legacy format documents containing resource_key
  const deleteLegacyRes = await collection.deleteMany({ resource_key: { $exists: true } });
  if (deleteLegacyRes.deletedCount > 0) {
    console.log(`Cleaned up ${deleteLegacyRes.deletedCount} legacy resource documents.`);
  }

  const cursor = collection.find({ organizationId: { $exists: true } });
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { organizationId: doc.organizationId },
        $unset: { organizationId: "" }
      }
    );
  }
  console.log('Database migration of organizationId completed successfully!');

  // Resolve Real Estate industry (code: temp0001)
  const realEstate = await Industry.findOne({ code: 'temp0001' });
  if (realEstate) {
    const updateResult = await collection.updateMany(
      {
        $or: [
          { industryId: { $exists: false } },
          { industryId: null },
          { industryId: { $type: "string" } }
        ]
      },
      { $set: { industryId: realEstate._id } }
    );
    if (updateResult.modifiedCount > 0) {
      console.log(`Set industryId to Real Estate on ${updateResult.modifiedCount} documents.`);
    }
  }
  if (!realEstate) {
    console.log('Real Estate industry (temp0001) not found in DB!');
    await mongoose.disconnect();
    return;
  }
  console.log(`Resolved Real Estate Industry ID: ${realEstate._id}`);

  // Fetch all roles for Real Estate
  const roles = await Role.find({ industryId: realEstate._id });
  console.log(`Found ${roles.length} roles for Real Estate`);

  // Clean up deprecated resource_carousel and other snake_case screens
  const deprecatedKeys = [
    'resource_carousel', 'resource_locations', 'resource_lead_sources', 
    'resource_budgets', 'resource_transfer_reasons', 'resource_property_stages', 
    'resource_property_types', 'resource_property_sub_types'
  ];
  await Screen.deleteMany({ key: { $in: deprecatedKeys } });

  for (const spec of RESOURCE_SCREENS) {
    console.log(`Seeding Screen: ${spec.key}...`);
    const screen = await Screen.findOneAndUpdate(
      { key: spec.key },
      { name: spec.name, description: spec.description, isActive: true },
      { upsert: true, new: true }
    );

    const fieldDocs = [];
    for (const f of spec.fields) {
      const doc = await ScreenField.findOneAndUpdate(
        { screen_id: screen._id, field_key: f.field_key },
        {
          label: f.label,
          type: f.type,
          options: f.options || [],
          dropdown_source: f.dropdown_source || 'none',
          dropdown_api: f.dropdown_api || '',
          is_table_visible: true,
          is_form_visible: true,
          is_required: !!f.is_required,
          sortable: true,
          order: f.order || 0,
          isActive: true
        },
        { upsert: true, new: true }
      );
      fieldDocs.push(doc);
    }

    // Set permissions for all roles
    for (const role of roles) {
      for (const field of fieldDocs) {
        await ScreenPermission.updateOne(
          {
            screen_id: screen._id,
            roleId: role._id,
            industryId: realEstate._id,
            field_id: field._id
          },
          { $set: { is_enabled: true } },
          { upsert: true }
        );
      }
    }

    // Seed initial items if none exist
    const count = await ResourceItem.countDocuments({ resource_key: spec.key, industryId: realEstate._id });
    if (count === 0) {
      console.log(`Seeding ${spec.items.length} initial items for ${spec.key}`);
      for (const itemData of spec.items) {
        await ResourceItem.create({
          industryId: realEstate._id,
          resource_key: spec.key,
          data: itemData
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
