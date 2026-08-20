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
  }
  const fields = await fieldModel.list(q);
  const validFieldIds = new Set(fields.map((f) => String(f._id)));
  return items.filter((item) => validFieldIds.has(String(item.fieldId)));
};

exports.bulkSet = async ({ screenId, roleId, industryId, fieldIds, organizationId, organization_id }) => {
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

  // Verify the (screen, role, industry) triple is internally consistent before
  // we write rows that would otherwise drift from real FKs.
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const mongoose = require('mongoose');
  const RoleModel = mongoose.model('Role');
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
  if (screen.organization_id && orgId && String(screen.organization_id) !== String(orgId)) {
    const err = new Error('Screen not found or access forbidden');
    err.status = 403;
    throw err;
  }
  if (!role) {
    const err = new Error('Role not found'); err.status = 404; throw err;
  }
  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(resolvedIndustryId)) {
    const err = new Error('Role does not belong to the given industry');
    err.status = 400;
    throw err;
  }

  // Admin must not grant permissions that are not allowed by the Industry-level configuration.
  if (orgId) {
    const baselineRole = await RoleModel.findOne({
      industry_id: resolvedIndustryId,
      key: role.key,
      organization_id: null
    }).exec();

    if (baselineRole) {
      const ScreenModel = mongoose.model('Screen');
      const baseScreen = await ScreenModel.findOne({
        key: screen.key,
        organization_id: null
      }).exec();

      if (baseScreen) {
        const ScreenPermissionModel = mongoose.model('ScreenPermission');
        const baselinePerms = await ScreenPermissionModel.find({
          screen_id: baseScreen._id,
          role_id: baselineRole._id,
          industry_id: resolvedIndustryId,
          organization_id: null,
          is_enabled: true
        }).lean().exec();

        const ScreenFieldModel = mongoose.model('ScreenField');
        const baselineFields = await ScreenFieldModel.find({
          _id: { $in: baselinePerms.map(p => p.field_id) }
        }).lean().exec();
        const allowedFieldKeys = new Set(baselineFields.map(f => f.field_key));

        const targetFields = await ScreenFieldModel.find({
          _id: { $in: fieldIds }
        }).lean().exec();

        const invalidFields = targetFields.filter(f => !allowedFieldKeys.has(f.field_key));
        if (invalidFields.length > 0) {
          const err = new Error(`Cannot grant permissions for field(s) [${invalidFields.map(f => f.label).join(', ')}] because they are not allowed by the Industry-level configuration.`);
          err.status = 400;
          throw err;
        }
      }
    }
  }

  // Verify every requested field belongs to this screen.
  if (fieldIds.length > 0) {
    const fields = await fieldModel.list({ screenId, organizationId: orgId });
    const validIds = new Set(fields.map((f) => String(f._id)));
    const invalid = fieldIds.filter((id) => !validIds.has(String(id)));
    if (invalid.length > 0) {
      const err = new Error(
        `fieldIds contains entries that do not belong to this screen: ${invalid.join(', ')}`,
      );
      err.status = 400;
      throw err;
    }
  }

  return permissionModel.bulkSetForCombo({
    screenId,
    roleId,
    industryId: resolvedIndustryId,
    fieldIds,
    organizationId: orgId
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
      organization_id: null
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

  const isSuperAdmin = resolvedRoleKey === 'superAdmin';
  const isGuestSignup = !authedUser && screen.key === 'organization';
  const bypassPermissions = isSuperAdmin || isGuestSignup;

  if (!industryCode && bypassPermissions) {
    industryCode = 'basic_crm';
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
  const fields = await ScreenFieldModel.find({
    screen_id: screen._id,
    $or: [{ organization_id: orgId }, { organization_id: null }],
    is_active: true
  }).lean().exec();

  if (fields.length === 0) {
    return {
      screen: { _id: screen._id, key: screen.key, name: screen.name },
      industryId: industry ? industry._id : null,
      roleId: role ? role._id : null,
      table_headers: [],
      form_fields: [],
    };
  }

  let allowed;
  if (bypassPermissions || finalScreenKey === 'users') {
    allowed = fields;
  } else {
    const ScreenPermissionModel = mongoose.model('ScreenPermission');
    let perms = await ScreenPermissionModel.find({
      organization_id: orgId,
      screen_id: screen._id,
      role_id: role._id,
      industry_id: industry._id,
      is_enabled: true
    }).lean().exec();

    if (!perms.length && orgId) {
      perms = await ScreenPermissionModel.find({
        organization_id: null,
        screen_id: screen._id,
        role_id: role._id,
        industry_id: industry._id,
        is_enabled: true
      }).lean().exec();
    }

    const allowedFieldIds = new Set(perms.map((p) => String(p.field_id)));
    allowed = fields.filter((f) => allowedFieldIds.has(String(f._id)));
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

  const indCode = String(industry?.code || '').toLowerCase().trim();
  const translations = (finalScreenKey === 'configProjects' && PROJECT_TRANSLATIONS[indCode]) || 
                       (finalScreenKey === 'users' && USER_TRANSLATIONS[indCode]) || 
                       (finalScreenKey === 'leadDistribution' && DISTRIBUTION_TRANSLATIONS[indCode]) ||
                       (finalScreenKey === 'leadRotation' && ROTATION_TRANSLATIONS[indCode]) || 
                       (finalScreenKey === 'contacts' && CONTACTS_TRANSLATIONS[indCode]) || 
                       (finalScreenKey === 'tasks' && TASKS_TRANSLATIONS[indCode]) || {};

  let resolvedScreenName = screen.name;
  if (finalScreenKey === 'configProjects') {
    if (indCode === 'temp0002') resolvedScreenName = 'Products Catalog';
    else if (indCode === 'temp0003') resolvedScreenName = 'Clinical Specialties';
    else if (indCode === 'temp0004') resolvedScreenName = 'Academic Programs';
    else if (indCode === 'temp0005') resolvedScreenName = 'Financial Portfolios';
    else if (indCode === 'temp0006') resolvedScreenName = 'Project Catalog';
    else if (indCode === 'temp0007') resolvedScreenName = 'Product Categories';
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
