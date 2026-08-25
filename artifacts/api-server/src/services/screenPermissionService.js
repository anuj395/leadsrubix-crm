const permissionModel = require('../models/screenPermissionModel');
const fieldModel = require('../models/screenFieldModel');
const screenModel = require('../models/screenModel');
const roleModel = require('../models/roleModel');
const industryModel = require('../models/industryModel');
const userModel = require('../models/userModel');

exports.list = async (opts) => {
  if (opts && opts.industryId) {
    const indDoc = await industryModel.findByCode(opts.industryId);
    if (indDoc) {
      opts.industryId = indDoc._id;
    }
  }
  const items = await permissionModel.list(opts);
  const q = { activeOnly: true };
  if (opts) {
    if (opts.screenId) q.screenId = opts.screenId;
    if (opts.organizationId) q.organizationId = opts.organizationId;
    if (opts.organization_id) q.organization_id = opts.organization_id;
    if (opts.workspaceId) q.workspaceId = opts.workspaceId;
    if (opts.workspace_id) q.workspace_id = opts.workspace_id;
  }
  const fields = await fieldModel.list(q);
  const fieldKeyToTargetId = new Map();
  const validFieldIds = new Set();
  for (const f of fields) {
    validFieldIds.add(String(f._id));
    fieldKeyToTargetId.set(f.field_key || f.fieldKey, String(f._id));
  }

  const mongoose = require('mongoose');
  const ScreenFieldModel = mongoose.model('ScreenField');
  const allFieldIds = [...new Set(items.map(i => i.fieldId || i.field_id).filter(Boolean))];
  const allFields = await ScreenFieldModel.find({ _id: { $in: allFieldIds } }).lean().exec();
  const fieldIdToKey = new Map(allFields.map(f => [String(f._id), f.field_key]));

  const result = [];
  const seenFieldIds = new Set();
  for (const item of items) {
    const fIdStr = String(item.fieldId || item.field_id);
    const fKey = fieldIdToKey.get(fIdStr);
    let targetId = null;
    if (validFieldIds.has(fIdStr)) {
      targetId = fIdStr;
    } else if (fKey && fieldKeyToTargetId.has(fKey)) {
      targetId = fieldKeyToTargetId.get(fKey);
    }
    if (targetId && !seenFieldIds.has(targetId)) {
      seenFieldIds.add(targetId);
      result.push({
        ...item,
        fieldId: targetId,
        field_id: targetId,
        fieldKey: fKey,
      });
    }
  }
  return result;
};

exports.bulkSet = async ({ screenId, roleId, industryId, fieldIds, organizationId, organization_id, workspaceId, workspace_id }) => {
  if (!screenId || !roleId || !industryId) {
    const err = new Error('screenId, roleId and industryId are required');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(fieldIds)) {
    const err = new Error('fieldIds must be an array');
    err.status = 400;
    throw err;
  }

  // Resolve industry by code or ID
  const industry = await industryModel.findByCode(industryId);
  if (!industry) {
    const err = new Error('Industry not found'); err.status = 404; throw err;
  }
  const resolvedIndustryId = industry._id;

  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const wsId = workspaceId !== undefined ? workspaceId : (workspace_id !== undefined ? workspace_id : (orgId ? 'ws_' + orgId : null));
  const mongoose = require('mongoose');
  const RoleModel = mongoose.model('Role');
  const ScreenModel = mongoose.model('Screen');
  const ScreenFieldModel = mongoose.model('ScreenField');

  const [screen, role] = await Promise.all([
    screenModel.findById(screenId),
    RoleModel.findOne({
      _id: roleId,
      $or: [{ organization_id: orgId }, { organization_id: null }]
    }).exec(),
  ]);
  if (!screen) {
    const err = new Error('Screen not found'); err.status = 404; throw err;
  }
  if (!role) {
    const err = new Error('Role not found'); err.status = 404; throw err;
  }

  // Find target fields by requested IDs
  const targetFields = await ScreenFieldModel.find({ _id: { $in: fieldIds } }).lean().exec();
  const selectedFieldKeys = new Set(targetFields.map(f => f.field_key));

  const allScreensForThisKey = await ScreenModel.find({ key: screen.key }).lean().exec();
  const allScreenIdsToSync = allScreensForThisKey.map(s => s._id);

  const allRolesForThisKey = await RoleModel.find({ industry_id: resolvedIndustryId, key: role.key }).lean().exec();
  const allRoleIdsToSync = allRolesForThisKey.map(r => r._id);

  const allScreenFields = await ScreenFieldModel.find({
    screen_id: { $in: allScreenIdsToSync }
  }).lean().exec();

  const allMatchingFieldIds = allScreenFields
    .filter(f => selectedFieldKeys.has(f.field_key))
    .map(f => String(f._id));

  for (const sId of allScreenIdsToSync) {
    for (const rId of allRoleIdsToSync) {
      await permissionModel.bulkSetForCombo({
        screenId: sId,
        roleId: rId,
        industryId: resolvedIndustryId,
        fieldIds: allMatchingFieldIds,
        organizationId: orgId,
        workspaceId: wsId,
      });
    }
  }

  return permissionModel.list({
    screenId: screen._id,
    roleId: role._id,
    industryId: resolvedIndustryId,
    organizationId: orgId,
    workspaceId: wsId,
  });
};

/**
 * Compose the screen view for a (screen, industry, role) triple.
 * If `industry_code`/`role_key` aren't given, falls back to the authenticated
 * user. Returns:
 *   {
 *     screen: { _id, key, name },
 *     industryId, roleId,
 *     table_headers: [{ key, label, type, sortable, order, options }],
 *     form_fields:   [{ key, label, type, required, options, order }]
 *   }
 *
 * Visibility rules:
 *   - Field must have isActive=true and screen.isActive=true.
 *   - A permission row with is_enabled=true must exist for (screen, role, industry, field).
 *   - is_table_visible / is_form_visible on the field decide which buckets it goes into.
 */
exports.resolve = async ({ screen_key, industry_code, role_key, screenKey, industryCode: inputIndustryCode, roleKey: inputRoleKey, authedUser, organizationId }) => {
  const finalScreenKey = screenKey || screen_key;
  if (!finalScreenKey) {
    const err = new Error('screenKey is required');
    err.status = 400;
    throw err;
  }

  const mongoose = require('mongoose');
  const orgId = organizationId || authedUser?.organizationId || authedUser?.organization_id || null;

  const ScreenModel = mongoose.model('Screen');
  let screen = null;
  if (orgId) {
    screen = await ScreenModel.findOne({
      key: finalScreenKey,
      organization_id: orgId
    }).exec();
  }
  if (!screen) {
    screen = await ScreenModel.findOne({
      key: finalScreenKey,
      $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }]
    }).exec();
  }

  if (!screen || !screen.is_active) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  // Resolve industry — explicit code wins; else fall back to user's industryId.
  let industryCode = inputIndustryCode || industry_code;
  let resolvedRoleKey = inputRoleKey || role_key;
  if ((!industryCode || !resolvedRoleKey) && authedUser?.id) {
    const u = await userModel.findById(authedUser.id);
    if (!industryCode) industryCode = u?.industryId;
    if (!resolvedRoleKey) resolvedRoleKey = u?.role || authedUser?.role;
  }

  const isSuperAdmin = resolvedRoleKey === 'superAdmin' || authedUser?.role === 'superAdmin';
  const isGuestSignup = !authedUser && screen.key === 'organization';
  const bypassPermissions = isSuperAdmin || isGuestSignup;

  if (!industryCode) {
    industryCode = authedUser?.industryId || authedUser?.industry_id || 'temp0001';
  }

  if (!bypassPermissions && !industryCode) {
    const err = new Error('industry_code is required (none found on user)');
    err.status = 400;
    throw err;
  }
  if (!resolvedRoleKey) {
    const err = new Error('role_key is required (none found on user)');
    err.status = 400;
    throw err;
  }

  let industry = null;
  if (industryCode) {
    if (mongoose.Types.ObjectId.isValid(industryCode)) {
      const IndustryModel = mongoose.model('Industry');
      industry = await IndustryModel.findById(industryCode).exec();
    } else {
      industry = await industryModel.findByCode(industryCode);
    }
    if (!industry && !bypassPermissions) {
      const err = new Error(`Industry with code/id "${industryCode}" not found`);
      err.status = 404;
      throw err;
    }
  }

  let role = null;
  if (!bypassPermissions) {
    const RoleModel = mongoose.model('Role');
    if (orgId) {
      role = await RoleModel.findOne({
        organization_id: orgId,
        industry_id: industry._id,
        key: resolvedRoleKey
      }).exec();
    }
    if (!role) {
      role = await RoleModel.findOne({
        organization_id: null,
        industry_id: industry._id,
        key: resolvedRoleKey
      }).exec();
    }

    if (!role && resolvedRoleKey === 'superAdmin') {
      try {
        role = await RoleModel.create({
          industry_id: industry._id,
          organization_id: orgId,
          key: 'superAdmin',
          name: 'Super Administrator',
          is_active: true
        });
      } catch (e) {
        // ignore
      }
    }
    if (!role) {
      const err = new Error(`Role "${resolvedRoleKey}" not found for industry "${industryCode}"`);
      err.status = 404;
      throw err;
    }
  }

  // Active fields for this screen.
  const ScreenFieldModel = mongoose.model('ScreenField');
  const wsId = authedUser?.workspaceId || authedUser?.workspace_id || (orgId ? 'ws_' + orgId : null);

  let fieldsQuery = { screen_id: screen._id, is_active: true };
  if (orgId && wsId) {
    fieldsQuery.$or = [
      { organization_id: orgId, workspace_id: wsId },
      { organization_id: orgId },
      { organization_id: null }
    ];
  } else if (orgId) {
    fieldsQuery.$or = [
      { organization_id: orgId },
      { organization_id: null }
    ];
  } else {
    fieldsQuery.$or = [{ organization_id: null }];
  }

  const rawFields = await ScreenFieldModel.find(fieldsQuery).lean().exec();

  const fieldMap = new Map();
  for (const f of rawFields) {
    const key = f.field_key;
    const existing = fieldMap.get(key);
    if (!existing) {
      fieldMap.set(key, f);
    } else {
      const existingOrg = existing.organization_id;
      const existingWs = existing.workspace_id;
      const currentOrg = f.organization_id;
      const currentWs = f.workspace_id;
      if (wsId && currentWs === wsId && existingWs !== wsId) {
        fieldMap.set(key, f);
      } else if (orgId && currentOrg === orgId && currentWs !== wsId && existingWs !== wsId && existingOrg !== orgId) {
        fieldMap.set(key, f);
      }
    }
  }
  const fields = Array.from(fieldMap.values());

  if (fields.length === 0) {
    return {
      screen: { _id: screen._id, key: screen.key, name: screen.name },
      industryId: industry ? industry._id : null,
      roleId: role ? role._id : null,
      table_headers: [],
      form_fields: [],
    };
  }

  const indCode = String(industry?.code || industryCode || '').toLowerCase().trim();

  const RE_FIELDS = new Set([
    'project_name', 'property_type', 'property_stage', 'budget', 'property_sub_type', 'location',
    'projectName', 'propertyType', 'propertyStage', 'propertySubType'
  ]);
  const ECOM_FIELDS = new Set([
    'order_i_d', 'order_value', 'cart_items_count', 'coupon_code', 'shipping_method', 'order_status',
    'order_id', 'orderID', 'orderValue', 'cartItemsCount', 'couponCode', 'shippingMethod', 'orderStatus'
  ]);
  const HEALTH_FIELDS = new Set([
    'patient_i_d', 'specialty', 'attending_doctor', 'appointment_date', 'insurance_provider',
    'patient_id', 'patientID', 'attendingDoctor', 'appointmentDate', 'insuranceProvider'
  ]);
  const EDU_FIELDS = new Set([
    'program_course', 'academic_year', 'entrance_score', 'counselor_assigned',
    'programCourse', 'academicYear', 'entranceScore', 'counselorAssigned'
  ]);
  const FIN_FIELDS = new Set([
    'product_type', 'requested_amount', 'annual_income', 'credit_score',
    'productType', 'requestedAmount', 'annualIncome', 'creditScore'
  ]);
  const IT_FIELDS = new Set([
    'service_line', 'rfp_deadline', 'estimated_budget', 'tech_stack',
    'serviceLine', 'rfpDeadline', 'estimatedBudget', 'techStack'
  ]);
  const MFG_FIELDS = new Set([
    'product_category', 'order_quantity', 'delivery_location', 'dealer_code',
    'productCategory', 'orderQuantity', 'deliveryLocation', 'dealerCode'
  ]);

  const ALL_CUSTOM_FIELDS = new Set([
    ...RE_FIELDS, ...ECOM_FIELDS, ...HEALTH_FIELDS, ...EDU_FIELDS, ...FIN_FIELDS, ...IT_FIELDS, ...MFG_FIELDS
  ]);

  function isFieldApplicableToIndustry(field, ind) {
    if (!field) return false;
    if (finalScreenKey !== 'contacts' && finalScreenKey !== 'leads.contact' && finalScreenKey !== 'leads') {
      return true;
    }
    const cleanKey = String(typeof field === 'string' ? field : (field.field_key || field.fieldKey || field.key || '')).trim();
    if (!ALL_CUSTOM_FIELDS.has(cleanKey)) return true;
    if (ind === 'temp0001') return RE_FIELDS.has(cleanKey);
    if (ind === 'temp0002') return ECOM_FIELDS.has(cleanKey);
    if (ind === 'temp0003') return HEALTH_FIELDS.has(cleanKey);
    if (ind === 'temp0004') return EDU_FIELDS.has(cleanKey);
    if (ind === 'temp0005') return FIN_FIELDS.has(cleanKey);
    if (ind === 'temp0006') return IT_FIELDS.has(cleanKey);
    if (ind === 'temp0007') return MFG_FIELDS.has(cleanKey);
    return RE_FIELDS.has(cleanKey);
  }

  let allowed;
  if (bypassPermissions || finalScreenKey === 'users' || finalScreenKey === 'organization') {
    allowed = fields.filter(f => isFieldApplicableToIndustry(f, indCode));
  } else {
    const ScreenPermissionModel = mongoose.model('ScreenPermission');
    const ScreenModel = mongoose.model('Screen');
    const RoleModel = mongoose.model('Role');

    const allScreensForThisKey = await ScreenModel.find({ key: screen.key }).select('_id').lean().exec();
    const allScreenIds = allScreensForThisKey.map(s => s._id);

    const allRolesForThisKey = await RoleModel.find({ industry_id: industry._id, key: role.key }).select('_id').lean().exec();
    const allRoleIds = allRolesForThisKey.map(r => r._id);

    let perms = [];
    if (orgId && wsId) {
      perms = await ScreenPermissionModel.find({
        organization_id: orgId,
        workspace_id: wsId,
        screen_id: { $in: allScreenIds },
        role_id: { $in: allRoleIds },
        industry_id: industry._id,
        is_enabled: true
      }).lean().exec();
    }
    if (!perms.length && orgId) {
      perms = await ScreenPermissionModel.find({
        organization_id: orgId,
        screen_id: { $in: allScreenIds },
        role_id: { $in: allRoleIds },
        industry_id: industry._id,
        is_enabled: true
      }).lean().exec();
    }
    if (!perms.length) {
      perms = await ScreenPermissionModel.find({
        organization_id: null,
        screen_id: { $in: allScreenIds },
        role_id: { $in: allRoleIds },
        industry_id: industry._id,
        is_enabled: true
      }).lean().exec();
    }

    const permFieldIds = perms.map((p) => p.field_id);
    const permFieldDocs = await ScreenFieldModel.find({ _id: { $in: permFieldIds } }).select('field_key').lean().exec();
    const allowedFieldKeys = new Set(permFieldDocs.map((f) => f.field_key));

    allowed = fields.filter((f) => allowedFieldKeys.has(f.field_key) && isFieldApplicableToIndustry(f, indCode));
  }

  if (!isSuperAdmin) {
    allowed = allowed.filter((f) => f.field_key !== 'organizationId' && f.field_key !== 'organization_id');
  }

  const PROJECT_TRANSLATIONS = {
    temp0002: { // E-Commerce
      projectName: 'Product Name',
      developerName: 'Supplier Name',
      propertyType: 'Product Category',
      propertyStage: 'Availability Stage',
      projectStatus: 'Status',
      address: 'Warehouse Address',
      reraLink: 'Catalog URL',
      walkthroughLink: 'Product Video Link'
    },
    temp0003: { // Healthcare
      projectName: 'Specialty Name',
      developerName: 'Attending Doctors',
      propertyType: 'Department',
      propertyStage: 'Clinical Wing',
      projectStatus: 'Status',
      address: 'Hospital Wing Address',
      reraLink: 'Accreditation Code',
      walkthroughLink: 'Brochure Link'
    },
    temp0004: { // Education
      projectName: 'Course Name',
      developerName: 'Faculty Head',
      propertyType: 'Program Category',
      propertyStage: 'Intake Batch',
      projectStatus: 'Status',
      address: 'Campus Address',
      reraLink: 'Syllabus Link',
      walkthroughLink: 'Virtual Tour Link'
    },
    temp0005: { // Finance
      projectName: 'Portfolio Name',
      developerName: 'Fund Manager',
      propertyType: 'Asset Class',
      propertyStage: 'Risk Profile',
      projectStatus: 'Status',
      address: 'Office Address',
      reraLink: 'KFS Document Link',
      walkthroughLink: 'Advisory Video Link'
    },
    temp0006: { // IT Services
      projectName: 'Service Line Name',
      developerName: 'Technical Lead',
      propertyType: 'Domain',
      propertyStage: 'Implementation Stage',
      projectStatus: 'Status',
      address: 'Delivery Center Address',
      reraLink: 'SLA Document Link',
      walkthroughLink: 'Case Study Link'
    },
    temp0007: { // Manufacturing
      projectName: 'Product Category',
      developerName: 'Plant Manager',
      propertyType: 'Material Class',
      propertyStage: 'Production Phase',
      projectStatus: 'Status',
      address: 'Factory Address',
      reraLink: 'ISO Certificate Link',
      walkthroughLink: 'Factory Tour Link'
    }
  };

  const USER_TRANSLATIONS = {
    temp0002: { // E-Commerce
      designation: 'Designation',
      team: 'Department',
      branch: 'Warehouse / Branch',
      reportingTo: 'Reporting Manager'
    },
    temp0003: { // Healthcare
      designation: 'Medical Designation',
      team: 'Medical Department',
      branch: 'Hospital / Clinic',
      reportingTo: 'Attending Head'
    },
    temp0004: { // Education
      designation: 'Faculty Designation',
      team: 'Academic Department',
      branch: 'Campus / Branch',
      reportingTo: 'Department Head'
    },
    temp0005: { // Finance
      designation: 'Advisor Designation',
      team: 'Advisory Team',
      branch: 'Office / Branch',
      reportingTo: 'Reporting Head'
    },
    temp0006: { // IT Services
      designation: 'Technical Role',
      team: 'Project Team',
      branch: 'Office / Location',
      reportingTo: 'Project Manager'
    },
    temp0007: { // Manufacturing
      designation: 'Plant Role',
      team: 'Production Team',
      branch: 'Factory / Plant',
      reportingTo: 'Plant Manager'
    }
  };

  const DISTRIBUTION_TRANSLATIONS = {
    temp0002: { // E-Commerce
      source: 'Inquiry Source',
      project: 'Product Catalog',
      location: 'Warehouse / Region',
      budget: 'Order Budget',
      propertyType: 'Product Category',
      distributionType: 'Routing Type',
      users: 'Assigned Agents'
    },
    temp0003: { // Healthcare
      source: 'Patient Source',
      project: 'Specialty',
      location: 'Clinic / Center',
      budget: 'Treatment Budget',
      propertyType: 'Clinical Wing',
      distributionType: 'Triage Type',
      users: 'Assigned Doctors / Staff'
    },
    temp0004: { // Education
      source: 'Lead Source',
      project: 'Course / Program',
      location: 'Campus / Branch',
      budget: 'Fee Budget',
      propertyType: 'Program Category',
      distributionType: 'Routing Type',
      users: 'Assigned Counselors'
    },
    temp0005: { // Finance
      source: 'Lead Source',
      project: 'Portfolio',
      location: 'Office / Region',
      budget: 'Investment Budget',
      propertyType: 'Asset Class',
      distributionType: 'Matching Type',
      users: 'Assigned Advisors'
    },
    temp0006: { // IT Services
      source: 'Lead Source',
      project: 'Service / Catalog',
      location: 'Delivery Center',
      budget: 'Deal Value',
      propertyType: 'Technology Stack',
      distributionType: 'Routing Type',
      users: 'Assigned Tech Leads'
    },
    temp0007: { // Manufacturing
      source: 'Lead Source',
      project: 'Product Category',
      location: 'Factory / Plant',
      budget: 'Distributor Value',
      propertyType: 'Production Line',
      distributionType: 'Allocation Type',
      users: 'Assigned Managers'
    }
  };

  const ROTATION_TRANSLATIONS = {
    temp0002: {
      source: 'Inquiry Source',
      project: 'Product Catalog',
      rotationTime: 'Routing Delay (mins)',
      users: 'Assigned Agents'
    },
    temp0003: {
      source: 'Patient Source',
      project: 'Specialty',
      rotationTime: 'Transfer Timeout (mins)',
      users: 'Assigned Doctors / Staff'
    },
    temp0004: {
      source: 'Lead Source',
      project: 'Course / Program',
      rotationTime: 'Transfer Timeout (mins)',
      users: 'Assigned Counselors'
    },
    temp0005: {
      source: 'Lead Source',
      project: 'Portfolio',
      rotationTime: 'Matching Delay (mins)',
      users: 'Assigned Advisors'
    },
    temp0006: {
      source: 'Lead Source',
      project: 'Service / Catalog',
      rotationTime: 'SLA Delay (mins)',
      users: 'Assigned Tech Leads'
    },
    temp0007: {
      source: 'Lead Source',
      project: 'Product Category',
      rotationTime: 'Reallocation Time (mins)',
      users: 'Assigned Managers'
    }
  };

  const CONTACTS_TRANSLATIONS = {
    temp0002: {
      customerName: 'Customer Name',
      contactNo: 'Contact Number',
      email: 'Email ID',
      project: 'Product Catalog',
      budget: 'Order Budget',
      propertyType: 'Product Category',
      leadSource: 'Inquiry Source',
      contactOwnerEmail: 'Agent Email',
    },
    temp0003: {
      customerName: 'Patient Name',
      contactNo: 'Phone Number',
      email: 'Email ID',
      project: 'Specialty',
      budget: 'Treatment Budget',
      propertyType: 'Clinical Wing',
      leadSource: 'Patient Source',
      contactOwnerEmail: 'Attending Doctor Email',
    },
    temp0004: {
      customerName: 'Student Name',
      contactNo: 'Phone Number',
      email: 'Email ID',
      project: 'Course / Program',
      budget: 'Fee Budget',
      propertyType: 'Program Category',
      leadSource: 'Lead Source',
      contactOwnerEmail: 'Counselor Email',
    },
    temp0005: {
      customerName: 'Client Name',
      contactNo: 'Phone Number',
      email: 'Email ID',
      project: 'Portfolio',
      budget: 'Investment Budget',
      propertyType: 'Asset Class',
      leadSource: 'Lead Source',
      contactOwnerEmail: 'Advisor Email',
    },
    temp0006: {
      customerName: 'Lead Name',
      contactNo: 'Phone Number',
      email: 'Email ID',
      project: 'Service / Catalog',
      budget: 'Deal Value',
      propertyType: 'Technology Stack',
      leadSource: 'Lead Source',
      contactOwnerEmail: 'Tech Lead Email',
    },
    temp0007: {
      customerName: 'Distributor Name',
      contactNo: 'Phone Number',
      email: 'Email ID',
      project: 'Product Category',
      budget: 'Distributor Value',
      propertyType: 'Production Line',
      leadSource: 'Lead Source',
      contactOwnerEmail: 'Manager Email',
    }
  };

  const TASKS_TRANSLATIONS = {
    temp0002: {
      customerName: 'Customer Name',
      contactNumber: 'Contact Number',
    },
    temp0003: {
      customerName: 'Patient Name',
      contactNumber: 'Phone Number',
      contactOwnerEmail: 'Attending Doctor Email',
      projectName: 'Specialty',
      budget: 'Treatment Budget',
      location: 'Hospital / Clinic',
    },
    temp0004: {
      customerName: 'Student Name',
      contactNumber: 'Phone Number',
      contactOwnerEmail: 'Counselor Email',
      projectName: 'Course / Program',
      budget: 'Fee Budget',
    },
    temp0005: {
      customerName: 'Client Name',
      contactNumber: 'Phone Number',
      contactOwnerEmail: 'Advisor Email',
      projectName: 'Portfolio',
      budget: 'Investment Budget',
    },
    temp0006: {
      customerName: 'Lead Name',
      contactNumber: 'Phone Number',
      contactOwnerEmail: 'Tech Lead Email',
      projectName: 'Service / Catalog',
      budget: 'Deal Value',
    },
    temp0007: {
      customerName: 'Distributor Name',
      contactNumber: 'Phone Number',
      contactOwnerEmail: 'Manager Email',
      projectName: 'Product Category',
      budget: 'Distributor Value',
      location: 'Factory / Plant',
    }
  };

  const DEALS_TRANSLATIONS = {
    temp0001: {
      title: 'Opportunity Name',
      name: 'Opportunity Name',
      amount: 'Deal Value (₹)',
      stage: 'Pipeline Stage',
      probability: 'Probability %',
      expectedCloseDate: 'Expected Close Date',
      contactName: 'Client Name',
      ownerName: 'Sales Consultant',
      notes: 'Requirements & Strategy Notes',
    },
    temp0002: {
      title: 'Order Opportunity',
      name: 'Order Opportunity',
      amount: 'Order Value (₹)',
      stage: 'Fulfillment Stage',
      probability: 'Conversion Probability %',
      expectedCloseDate: 'Target Delivery Date',
      contactName: 'Customer Name',
      ownerName: 'Account Manager',
      notes: 'Order Specifications & Notes',
    },
    temp0003: {
      title: 'Treatment Case',
      name: 'Treatment Case',
      amount: 'Treatment Cost (₹)',
      stage: 'Clinical Stage',
      probability: 'Procedure Probability %',
      expectedCloseDate: 'Admission / Surgery Date',
      contactName: 'Patient Name',
      ownerName: 'Attending Doctor / Coordinator',
      notes: 'Clinical Requirements & Notes',
    },
    temp0004: {
      title: 'Admission Opportunity',
      name: 'Admission Opportunity',
      amount: 'Program Fee / Tuition (₹)',
      stage: 'Admission Stage',
      probability: 'Enrollment Probability %',
      expectedCloseDate: 'Enrollment Deadline',
      contactName: 'Student Name',
      ownerName: 'Academic Counselor',
      notes: 'Academic Profile & Notes',
    },
    temp0005: {
      title: 'Investment Deal',
      name: 'Investment Deal',
      amount: 'Investment Amount (₹)',
      stage: 'Advisory Stage',
      probability: 'Closing Probability %',
      expectedCloseDate: 'Target Funding Date',
      contactName: 'Investor / Client Name',
      ownerName: 'Wealth Advisor',
      notes: 'Portfolio Mandate & Notes',
    },
    temp0006: {
      title: 'Contract / SOW Opportunity',
      name: 'Contract / SOW Opportunity',
      amount: 'Contract Value (₹)',
      stage: 'Sales / SOW Stage',
      probability: 'Win Probability %',
      expectedCloseDate: 'Target Kickoff Date',
      contactName: 'Client Stakeholder Name',
      ownerName: 'Tech Lead / Account Executive',
      notes: 'Tech Stack & Scope Notes',
    },
    temp0007: {
      title: 'Commercial Batch Order',
      name: 'Commercial Batch Order',
      amount: 'Order Value (₹)',
      stage: 'Production / Deal Stage',
      probability: 'Fulfillment Probability %',
      expectedCloseDate: 'Dispatch Date',
      contactName: 'Distributor Name',
      ownerName: 'Commercial Manager',
      notes: 'Batch Specifications & Notes',
    }
  };

  const RESOURCE_FIELD_TRANSLATIONS = {
    resourcePropertyTypes: {
      temp0001: { propertyType: 'Property Type', property_type: 'Property Type', name: 'Property Type' },
      temp0002: { propertyType: 'Product Category', property_type: 'Product Category', name: 'Product Category' },
      temp0003: { propertyType: 'Department', property_type: 'Department', name: 'Department' },
      temp0004: { propertyType: 'Program Category', property_type: 'Program Category', name: 'Program Category' },
      temp0005: { propertyType: 'Financial Product', property_type: 'Financial Product', name: 'Financial Product' },
      temp0006: { propertyType: 'Domain & Tech Stack', property_type: 'Domain & Tech Stack', name: 'Domain & Tech Stack' },
      temp0007: { propertyType: 'Material Class', property_type: 'Material Class', name: 'Material Class' },
    },
    resourcePropertyStages: {
      temp0001: { stage: 'Property Stage', propertyStage: 'Property Stage', name: 'Property Stage' },
      temp0002: { stage: 'Availability Stage', propertyStage: 'Availability Stage', name: 'Availability Stage' },
      temp0003: { stage: 'Clinical Wing', propertyStage: 'Clinical Wing', name: 'Clinical Wing' },
      temp0004: { stage: 'Intake Batch', propertyStage: 'Intake Batch', name: 'Intake Batch' },
      temp0005: { stage: 'Risk Profile', propertyStage: 'Risk Profile', name: 'Risk Profile' },
      temp0006: { stage: 'Implementation Stage', propertyStage: 'Implementation Stage', name: 'Implementation Stage' },
      temp0007: { stage: 'Production Phase', propertyStage: 'Production Phase', name: 'Production Phase' },
    },
    resourceBudgets: {
      temp0001: { budget: 'Budget', budgetRange: 'Budget Range', name: 'Budget' },
      temp0002: { budget: 'Price Range', budgetRange: 'Price Range', name: 'Price Range' },
      temp0003: { budget: 'Treatment Budget', budgetRange: 'Treatment Budget', name: 'Treatment Budget' },
      temp0004: { budget: 'Course Fee Range', budgetRange: 'Course Fee Range', name: 'Course Fee Range' },
      temp0005: { budget: 'Investment Amount', budgetRange: 'Investment Amount', name: 'Investment Amount' },
      temp0006: { budget: 'Project Budget', budgetRange: 'Project Budget', name: 'Project Budget' },
      temp0007: { budget: 'Order Volume', budgetRange: 'Order Volume', name: 'Order Volume' },
    },
    resourceLocations: {
      temp0001: { location: 'Location', locationName: 'Location', name: 'Location' },
      temp0002: { location: 'Warehouse / Hub', locationName: 'Warehouse / Hub', name: 'Warehouse / Hub' },
      temp0003: { location: 'Clinic / Center', locationName: 'Clinic / Center', name: 'Clinic / Center' },
      temp0004: { location: 'Campus / Branch', locationName: 'Campus / Branch', name: 'Campus / Branch' },
      temp0005: { location: 'Branch Office', locationName: 'Branch Office', name: 'Branch Office' },
      temp0006: { location: 'Delivery Center', locationName: 'Delivery Center', name: 'Delivery Center' },
      temp0007: { location: 'Manufacturing Plant', locationName: 'Manufacturing Plant', name: 'Manufacturing Plant' },
    },
    resourceLeadSources: {
      temp0001: { leadSource: 'Lead Source', source: 'Lead Source', name: 'Lead Source' },
      temp0002: { leadSource: 'Customer Channel', source: 'Customer Channel', name: 'Customer Channel' },
      temp0003: { leadSource: 'Patient Source', source: 'Patient Source', name: 'Patient Source' },
      temp0004: { leadSource: 'Student Channel', source: 'Student Channel', name: 'Student Channel' },
      temp0005: { leadSource: 'Client Source', source: 'Client Source', name: 'Client Source' },
      temp0006: { leadSource: 'Lead Channel', source: 'Lead Channel', name: 'Lead Channel' },
      temp0007: { leadSource: 'Dealer Channel', source: 'Dealer Channel', name: 'Dealer Channel' },
    },
    resourceTransferReasons: {
      temp0001: { reason: 'Transfer Reason', transferReason: 'Transfer Reason', name: 'Transfer Reason' },
      temp0002: { reason: 'Return Reason', transferReason: 'Return Reason', name: 'Return Reason' },
      temp0003: { reason: 'Transfer Reason', transferReason: 'Transfer Reason', name: 'Transfer Reason' },
      temp0004: { reason: 'Course Transfer Reason', transferReason: 'Course Transfer Reason', name: 'Course Transfer Reason' },
      temp0005: { reason: 'Advisor Reassign Reason', transferReason: 'Advisor Reassign Reason', name: 'Advisor Reassign Reason' },
      temp0006: { reason: 'Project Transfer Reason', transferReason: 'Project Transfer Reason', name: 'Project Transfer Reason' },
      temp0007: { reason: 'Order Reassign Reason', transferReason: 'Order Reassign Reason', name: 'Order Reassign Reason' },
    }
  };

  const resTranslations = RESOURCE_FIELD_TRANSLATIONS[finalScreenKey] ? (RESOURCE_FIELD_TRANSLATIONS[finalScreenKey][indCode] || {}) : {};

  const translations = ((finalScreenKey === 'configProjects' || finalScreenKey === 'projects' || finalScreenKey === 'configuration.projects') && PROJECT_TRANSLATIONS[indCode]) || 
                       (finalScreenKey === 'users' && USER_TRANSLATIONS[indCode]) || 
                       ((finalScreenKey === 'leadDistribution' || finalScreenKey === 'leaddistribution') && DISTRIBUTION_TRANSLATIONS[indCode]) ||
                       ((finalScreenKey === 'leadRotation' || finalScreenKey === 'leadrotation') && ROTATION_TRANSLATIONS[indCode]) || 
                       ((finalScreenKey === 'contacts' || finalScreenKey === 'leads.contact' || finalScreenKey === 'leads' || finalScreenKey === 'sorted' || finalScreenKey === 'leads.sorted') && CONTACTS_TRANSLATIONS[indCode]) || 
                       ((finalScreenKey === 'tasks' || finalScreenKey === 'leads.tasks') && TASKS_TRANSLATIONS[indCode]) || 
                       ((finalScreenKey === 'deals' || finalScreenKey === 'leads.deals') && DEALS_TRANSLATIONS[indCode]) || 
                       resTranslations || {};

  let resolvedScreenName = screen.name;
  if (finalScreenKey === 'configProjects' || finalScreenKey === 'projects' || finalScreenKey === 'configuration.projects') {
    if (indCode === 'temp0002') resolvedScreenName = 'Products Catalog';
    else if (indCode === 'temp0003') resolvedScreenName = 'Clinical Specialties';
    else if (indCode === 'temp0004') resolvedScreenName = 'Academic Programs';
    else if (indCode === 'temp0005') resolvedScreenName = 'Financial Portfolios';
    else if (indCode === 'temp0006') resolvedScreenName = 'Project Catalog';
    else if (indCode === 'temp0007') resolvedScreenName = 'Product Categories';
  } else if (finalScreenKey === 'deals' || finalScreenKey === 'leads.deals') {
    if (indCode === 'temp0002') resolvedScreenName = 'Orders & Pipeline';
    else if (indCode === 'temp0003') resolvedScreenName = 'Treatment Cases & Triage';
    else if (indCode === 'temp0004') resolvedScreenName = 'Admissions & Pipeline';
    else if (indCode === 'temp0005') resolvedScreenName = 'Investment Deals & Mandates';
    else if (indCode === 'temp0006') resolvedScreenName = 'Contracts & SOW Pipeline';
    else if (indCode === 'temp0007') resolvedScreenName = 'Commercial Orders & Deals';
  } else if (finalScreenKey === 'contacts' || finalScreenKey === 'leads.contact' || finalScreenKey === 'leads' || finalScreenKey === 'sorted' || finalScreenKey === 'leads.sorted') {
    if (indCode === 'temp0002') resolvedScreenName = 'Customer Inquiries & Leads';
    else if (indCode === 'temp0003') resolvedScreenName = 'Patient Inquiries & Leads';
    else if (indCode === 'temp0004') resolvedScreenName = 'Student Inquiries & Leads';
    else if (indCode === 'temp0005') resolvedScreenName = 'Investor Inquiries & Leads';
    else if (indCode === 'temp0006') resolvedScreenName = 'Client Inquiries & Leads';
    else if (indCode === 'temp0007') resolvedScreenName = 'Distributor Inquiries & Leads';
    else resolvedScreenName = 'Inquiries & Leads';
  } else if (finalScreenKey === 'tasks' || finalScreenKey === 'leads.tasks') {
    if (indCode === 'temp0002') resolvedScreenName = 'Customer Follow-ups';
    else if (indCode === 'temp0003') resolvedScreenName = 'Consultations';
    else if (indCode === 'temp0004') resolvedScreenName = 'Counseling Tasks';
    else if (indCode === 'temp0005') resolvedScreenName = 'KYC & Advisory Tasks';
    else if (indCode === 'temp0006') resolvedScreenName = 'Service Desk Tasks';
    else if (indCode === 'temp0007') resolvedScreenName = 'Quality Checks';
    else resolvedScreenName = 'Tasks List';
  }

  const tableHeaders = allowed
    .sort((a, b) => a.order - b.order)
    .map((f) => {
      const fieldKeyCamel = f.field_key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      return {
        key: fieldKeyCamel,
        label: translations[fieldKeyCamel] || f.label,
        type: f.type,
        sortable: f.sortable,
        order: f.order,
        options: f.options || [],
        visible: f.is_table_visible,
      };
    });

  const formFields = allowed
    .filter((f) => f.is_form_visible)
    .sort((a, b) => a.order - b.order)
    .map((f) => {
      const fieldKeyCamel = f.field_key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      return {
        key: fieldKeyCamel,
        label: translations[fieldKeyCamel] || f.label,
        type: f.type,
        required: f.is_required,
        options: f.options || [],
        dropdownSource: f.dropdown_source || 'none',
        dropdownApi: f.dropdown_api || '',
        dropdown_source: f.dropdown_source || 'none',
        dropdown_api: f.dropdown_api || '',
        order: f.order,
      };
    });

  return {
    screen: { _id: screen._id, key: screen.key, name: resolvedScreenName },
    industryId: industry ? industry._id : null,
    roleId: role ? role._id : null,
    tableHeaders,
    table_headers: tableHeaders,
    formFields,
    form_fields: formFields,
  };
};
