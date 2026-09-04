const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/leadsrubix-migrate-crm';

// Define schemas if they aren't registered yet (since we are running standalone)
const ScreenSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  is_active: { type: Boolean, default: true }
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
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const ScreenPermissionSchema = new mongoose.Schema({
  screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  field_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ScreenField', required: true },
  is_enabled: { type: Boolean, default: true }
}, { timestamps: true });

const IndustrySchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const RoleSchema = new mongoose.Schema({
  industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const ResourceItemSchema = new mongoose.Schema({
  industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
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
    key: 'resource_carousel',
    name: 'Carousel Banners',
    description: 'Banners shown on mobile/web dashboard carousel',
    fields: [
      { field_key: 'url', label: 'Image URL', type: 'text', is_required: true, order: 1 },
      { field_key: 'image_name', label: 'Image Name', type: 'text', is_required: true, order: 2 },
    ],
    items: [
      { url: 'https://via.placeholder.com/150', image_name: 'app_banner.png' },
    ]
  },
  {
    key: 'resource_locations',
    name: 'Locations',
    description: 'Corporate and site branch locations',
    fields: [
      { field_key: 'location_name', label: 'Location Name', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { location_name: 'Mumbai - Bandra West' },
      { location_name: 'South Delhi - Greater Kailash' },
      { location_name: 'Bangalore - Whitefield' },
      { location_name: 'Gurgaon - Golf Course Road' },
      { location_name: 'Hyderabad - HITEC City' },
      { location_name: 'Pune - Koregaon Park' },
    ]
  },
  {
    key: 'resource_lead_sources',
    name: 'Lead Sources',
    description: 'Marketing source channels',
    fields: [
      { field_key: 'leadSource', label: 'Lead Source Name', type: 'text', is_required: true, order: 1 },
      { field_key: 'leadSourceColor', label: 'Color Hex', type: 'text', is_required: false, order: 2 },
    ],
    items: [
      { leadSource: 'Sulekha', leadSourceColor: '#3B82F6' },
      { leadSource: 'Self Generated', leadSourceColor: '#10B981' },
      { leadSource: 'OLX', leadSourceColor: '#F97316' },
      { leadSource: 'Makaan.com', leadSourceColor: '#8B5CF6' },
      { leadSource: 'Magicbricks', leadSourceColor: '#EF4444' },
      { leadSource: 'LinkedIn Ads', leadSourceColor: '#0A66C2' },
      { leadSource: 'Justdial', leadSourceColor: '#14B8A6' },
      { leadSource: 'Indiamart', leadSourceColor: '#2563EB' },
      { leadSource: 'Housing.com', leadSourceColor: '#EC4899' },
      { leadSource: 'Google Ads', leadSourceColor: '#34A853' },
      { leadSource: 'Facebook', leadSourceColor: '#1877F2' },
      { leadSource: '99 Acres', leadSourceColor: '#F59E0B' },
    ]
  },
  {
    key: 'resource_budgets',
    name: 'Budgets',
    description: 'Standard budget options',
    fields: [
      { field_key: 'budget', label: 'Budget Range', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { budget: 'Rs.40 Lacs - Rs.50 Lacs' },
      { budget: 'Rs.50 Lacs - Rs.60 Lacs' },
      { budget: 'Rs.60 Lacs - Rs.70 Lacs' },
      { budget: 'Rs.70 Lacs - Rs.80 Lacs' },
      { budget: 'Rs.80 Lacs - Rs.90 Lacs' },
      { budget: 'Rs.90 Lacs - Rs.1 Cr' },
    ]
  },
  {
    key: 'resource_transfer_reasons',
    name: 'Transfer Reasons',
    description: 'Reasons for transferring leads',
    fields: [
      { field_key: 'reason', label: 'Reason', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { reason: 'Fresh Leads' },
      { reason: 'Old Leads' },
      { reason: 'Not Interested Leads' },
    ]
  },
  {
    key: 'resource_property_stages',
    name: 'Property Stages',
    description: 'Construction stages',
    fields: [
      { field_key: 'stage', label: 'Stage Name', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { stage: 'Under Construction' },
      { stage: 'Ready to Move In (RTM) or Completed' },
    ]
  },
  {
    key: 'resource_property_types',
    name: 'Property Types',
    description: 'Property categories',
    fields: [
      { field_key: 'propertyType', label: 'Property Type', type: 'text', is_required: true, order: 1 },
    ],
    items: [
      { propertyType: 'Residential Properties' },
      { propertyType: 'Commercial Properties' },
      { propertyType: 'Investment Properties' },
      { propertyType: 'Plots & Land' },
      { propertyType: 'Special Purpose Properties' },
      { propertyType: 'Government Properties' },
    ]
  },
  {
    key: 'resource_property_sub_types',
    name: 'Property Sub Types',
    description: 'Property subcategories',
    fields: [
      { field_key: 'propertyType', label: 'Property Type', type: 'select', dropdown_source: 'api', dropdown_api: '/api/options/resource_property_types?display=propertyType', is_required: true, order: 1 },
      { field_key: 'property_sub_type', label: 'Property Sub Type', type: 'text', is_required: true, order: 2 },
    ],
    items: [
      { propertyType: 'Residential Properties', property_sub_type: 'Apartments/Condos' },
      { propertyType: 'Residential Properties', property_sub_type: 'Townhouses' },
      { propertyType: 'Residential Properties', property_sub_type: 'Villas' },
      { propertyType: 'Commercial Properties', property_sub_type: 'Office Spaces' },
      { propertyType: 'Commercial Properties', property_sub_type: 'Retail Spaces' },
      { propertyType: 'Commercial Properties', property_sub_type: 'Industrial Properties' },
      { propertyType: 'Investment Properties', property_sub_type: 'Rental Properties' },
      { propertyType: 'Investment Properties', property_sub_type: 'Vacation Homes' },
      { propertyType: 'Plots & Land', property_sub_type: 'Agricultural Land' },
      { propertyType: 'Plots & Land', property_sub_type: 'Residential Land' },
      { propertyType: 'Special Purpose Properties', property_sub_type: 'Hotels and Resorts' },
      { propertyType: 'Special Purpose Properties', property_sub_type: 'Healthcare Facilities' },
      { propertyType: 'Special Purpose Properties', property_sub_type: 'Educational Institutions' },
      { propertyType: 'Government Properties', property_sub_type: 'Public Buildings' },
      { propertyType: 'Government Properties', property_sub_type: 'Military Bases' },
    ]
  }
];

async function main() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  // Resolve Real Estate industry (code: temp0001)
  const realEstate = await Industry.findOne({ code: 'temp0001' });
  if (!realEstate) {
    console.log('Real Estate industry (temp0001) not found in DB!');
    await mongoose.disconnect();
    return;
  }
  console.log(`Resolved Real Estate Industry ID: ${realEstate._id}`);

  // Fetch all roles for Real Estate
  const roles = await Role.find({ industry_id: realEstate._id });
  console.log(`Found ${roles.length} roles for Real Estate`);

  for (const spec of RESOURCE_SCREENS) {
    console.log(`Seeding Screen: ${spec.key}...`);
    const screen = await Screen.findOneAndUpdate(
      { key: spec.key },
      { name: spec.name, description: spec.description, is_active: true },
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
          is_active: true
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
            role_id: role._id,
            industry_id: realEstate._id,
            field_id: field._id
          },
          { $set: { is_enabled: true } },
          { upsert: true }
        );
      }
    }

    // Seed initial items if none exist
    const count = await ResourceItem.countDocuments({ resource_key: spec.key, industry_id: realEstate._id });
    if (count === 0) {
      console.log(`Seeding ${spec.items.length} initial items for ${spec.key}`);
      for (const itemData of spec.items) {
        await ResourceItem.create({
          industry_id: realEstate._id,
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
