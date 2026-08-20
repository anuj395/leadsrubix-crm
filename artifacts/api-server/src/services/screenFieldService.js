const fieldModel = require('../models/screenFieldModel');
const screenModel = require('../models/screenModel');
const permissionModel = require('../models/screenPermissionModel');

exports.list = async (opts) => {
  const fields = await fieldModel.list(opts);
  if (!opts || !opts.industryCode) return fields;

  const mongoose = require('mongoose');
  const Industry = mongoose.model('Industry');
  let industry = null;
  const indCodeOrId = opts.industryCode;
  if (mongoose.Types.ObjectId.isValid(indCodeOrId)) {
    industry = await Industry.findById(indCodeOrId).lean().exec();
  } else {
    industry = await Industry.findOne({ code: indCodeOrId }).lean().exec();
  }
  const indCode = String(industry?.code || '').toLowerCase().trim();

  const PROJECT_TRANSLATIONS = {
    temp0002: { projectName: 'Product Name', developerName: 'Supplier Name', address: 'Warehouse Address', reraLink: 'Details Link', walkthroughLink: 'Catalog Walkthrough Link', propertyType: 'Product Class', propertyStage: 'Availability Stage', projectStatus: 'Catalog Status' },
    temp0003: { projectName: 'Specialty Name', developerName: 'Attending Head / Chief', address: 'Hospital Wing Address', reraLink: 'Accreditation Code / Link', walkthroughLink: 'Brochure Link', propertyType: 'Hospital / Clinic Wing', propertyStage: 'Treatment Area Level', projectStatus: 'Operational Status' },
    temp0004: { projectName: 'Course Name', developerName: 'Instructor Name', address: 'Campus Address', reraLink: 'Syllabus PDF / Link', walkthroughLink: 'Campus Walkthrough Link', propertyType: 'Course Category', propertyStage: 'Academic Semester', projectStatus: 'Enrollment Status' },
    temp0005: { projectName: 'Portfolio Name', developerName: 'Manager / Advisor Name', address: 'Branch Office Address', reraLink: 'Regulatory Prospectus Link', walkthroughLink: 'Strategy Deck Link', propertyType: 'Asset Class', propertyStage: 'Risk Profile', projectStatus: 'Fund Status' },
    temp0006: { projectName: 'Service Name', developerName: 'Partner Name', address: 'Delivery Center Address', reraLink: 'SLA Scope Document Link', walkthroughLink: 'Demo Video Link', propertyType: 'Tech Stack', propertyStage: 'Project Phase', projectStatus: 'Delivery Status' },
    temp0007: { projectName: 'Category Name', developerName: 'Plant Manager Name', address: 'Factory Address', reraLink: 'Compliance Certification Link', walkthroughLink: 'Catalog Walkthrough Link', propertyType: 'Production Line', propertyStage: 'Process Stage', projectStatus: 'Production Status' }
  };

  const USER_TRANSLATIONS = {
    temp0002: { medicalDepartment: 'Store / Department', hospitalClinic: 'Warehouse / Location', medicalDesignation: 'Agent Designation' },
    temp0003: { medicalDepartment: 'Medical Department', hospitalClinic: 'Hospital / Clinic', medicalDesignation: 'Medical Designation' },
    temp0004: { medicalDepartment: 'Academic Department', hospitalClinic: 'Campus / School', medicalDesignation: 'Academic Designation' },
    temp0005: { medicalDepartment: 'Investment Desk', hospitalClinic: 'Office Branch', medicalDesignation: 'Advisor Designation' },
    temp0006: { medicalDepartment: 'Technical Department', hospitalClinic: 'Delivery Center', medicalDesignation: 'Engineer Designation' },
    temp0007: { medicalDepartment: 'Production Department', hospitalClinic: 'Factory / Plant', medicalDesignation: 'Staff Designation' }
  };

  const DISTRIBUTION_TRANSLATIONS = {
    temp0002: { source: 'Inquiry Source', project: 'Product Catalog', location: 'Warehouse / Region', budget: 'Order Budget', propertyType: 'Product Category', distributionType: 'Routing Type', users: 'Assigned Agents' },
    temp0003: { source: 'Patient Source', project: 'Specialty', location: 'Clinic / Center', budget: 'Treatment Budget', propertyType: 'Clinical Wing', distributionType: 'Triage Type', users: 'Assigned Doctors / Staff' },
    temp0004: { source: 'Lead Source', project: 'Course / Program', location: 'Campus / Branch', budget: 'Fee Budget', propertyType: 'Program Category', distributionType: 'Routing Type', users: 'Assigned Counselors' },
    temp0005: { source: 'Lead Source', project: 'Portfolio', location: 'Office / Region', budget: 'Investment Budget', propertyType: 'Asset Class', distributionType: 'Matching Type', users: 'Assigned Advisors' },
    temp0006: { source: 'Lead Source', project: 'Service / Catalog', location: 'Delivery Center', budget: 'Deal Value', propertyType: 'Technology Stack', distributionType: 'Routing Type', users: 'Assigned Tech Leads' },
    temp0007: { source: 'Lead Source', project: 'Product Category', location: 'Factory / Plant', budget: 'Distributor Value', propertyType: 'Production Line', distributionType: 'Allocation Type', users: 'Assigned Managers' }
  };

  const ROTATION_TRANSLATIONS = {
    temp0002: { source: 'Inquiry Source', project: 'Product Catalog', rotationTime: 'Routing Delay (mins)', users: 'Assigned Agents' },
    temp0003: { source: 'Patient Source', project: 'Specialty', rotationTime: 'Transfer Timeout (mins)', users: 'Assigned Doctors / Staff' },
    temp0004: { source: 'Lead Source', project: 'Course / Program', rotationTime: 'Transfer Timeout (mins)', users: 'Assigned Counselors' },
    temp0005: { source: 'Lead Source', project: 'Portfolio', rotationTime: 'Matching Delay (mins)', users: 'Assigned Advisors' },
    temp0006: { source: 'Lead Source', project: 'Service / Catalog', rotationTime: 'SLA Delay (mins)', users: 'Assigned Tech Leads' },
    temp0007: { source: 'Lead Source', project: 'Product Category', rotationTime: 'Reallocation Time (mins)', users: 'Assigned Managers' }
  };

  const CONTACTS_TRANSLATIONS = {
    temp0002: { customerName: 'Customer Name', contactNo: 'Contact Number', contactNumber: 'Contact Number', email: 'Email ID', project: 'Product Catalog', projectName: 'Product Catalog', budget: 'Order Budget', propertyType: 'Product Category', propertyStage: 'Inventory Stage', propertySubType: 'Product Sub Category', leadSource: 'Inquiry Source', source: 'Inquiry Source', contactOwnerEmail: 'Agent Email' },
    temp0003: { customerName: 'Patient Name', contactNo: 'Phone Number', contactNumber: 'Phone Number', email: 'Email ID', project: 'Specialty', projectName: 'Specialty', budget: 'Treatment Budget', propertyType: 'Clinical Wing', propertyStage: 'Clinical Wing Stage', propertySubType: 'Clinical Specialty Sub Type', leadSource: 'Patient Source', source: 'Patient Source', contactOwnerEmail: 'Attending Doctor Email' },
    temp0004: { customerName: 'Student Name', contactNo: 'Phone Number', contactNumber: 'Phone Number', email: 'Email ID', project: 'Course / Program', projectName: 'Course / Program', budget: 'Fee Budget', propertyType: 'Program Category', propertyStage: 'Academic Semester', propertySubType: 'Program Sub Category', leadSource: 'Lead Source', source: 'Lead Source', contactOwnerEmail: 'Counselor Email' },
    temp0005: { customerName: 'Client Name', contactNo: 'Phone Number', contactNumber: 'Phone Number', email: 'Email ID', project: 'Portfolio', projectName: 'Portfolio', budget: 'Investment Budget', propertyType: 'Asset Class', propertyStage: 'Risk Profile', propertySubType: 'Asset Sub Class', leadSource: 'Lead Source', source: 'Lead Source', contactOwnerEmail: 'Advisor Email' },
    temp0006: { customerName: 'Lead Name', contactNo: 'Phone Number', contactNumber: 'Phone Number', email: 'Email ID', project: 'Service / Catalog', projectName: 'Service / Catalog', budget: 'Deal Value', propertyType: 'Technology Stack', propertyStage: 'Project Phase', propertySubType: 'Technology Branch', leadSource: 'Lead Source', source: 'Lead Source', contactOwnerEmail: 'Tech Lead Email' },
    temp0007: { customerName: 'Distributor Name', contactNo: 'Phone Number', contactNumber: 'Phone Number', email: 'Email ID', project: 'Product Category', projectName: 'Product Category', budget: 'Distributor Value', propertyType: 'Production Line', propertyStage: 'Process Stage', propertySubType: 'Production Batch', leadSource: 'Lead Source', source: 'Lead Source', contactOwnerEmail: 'Manager Email' }
  };

  const Screen = mongoose.model('Screen');
  const screen = await Screen.findById(opts.screenId).lean().exec();
  const screenKey = screen?.key;

  const translations = (screenKey === 'configProjects' && PROJECT_TRANSLATIONS[indCode]) || 
                       (screenKey === 'users' && USER_TRANSLATIONS[indCode]) || 
                       (screenKey === 'leadDistribution' && DISTRIBUTION_TRANSLATIONS[indCode]) ||
                       (screenKey === 'leadRotation' && ROTATION_TRANSLATIONS[indCode]) || 
                       (screenKey === 'contacts' && CONTACTS_TRANSLATIONS[indCode]) || {};

  const ALL_INDUSTRY_FIELDS = {
    temp0002: ['orderID', 'orderValue', 'cartItemsCount', 'couponCode', 'shippingMethod', 'orderStatus', 'cart_items_count'],
    temp0003: ['patientID', 'specialty', 'attendingDoctor', 'appointmentDate', 'insuranceProvider', 'patient_id'],
    temp0004: ['programCourse', 'academicYear', 'entranceScore', 'counselorAssigned', 'rollNumber', 'academicTerm', 'parentName', 'academic_year', 'entrance_score', 'counselor_assigned'],
    temp0005: ['productType', 'requestedAmount', 'annualIncome', 'creditScore', 'product_type', 'requested_amount', 'annual_income', 'credit_score'],
    temp0006: ['serviceLine', 'rfpDeadline', 'estimatedBudget', 'techStack', 'service_line', 'rfp_deadline', 'estimated_budget', 'tech_stack'],
    temp0007: ['productCategory', 'orderQuantity', 'deliveryLocation', 'dealerCode', 'product_category', 'order_quantity', 'delivery_location', 'dealer_code']
  };

  const excludes = [];
  Object.keys(ALL_INDUSTRY_FIELDS).forEach((key) => {
    if (key !== indCode) {
      excludes.push(...ALL_INDUSTRY_FIELDS[key]);
    }
  });
  const filteredFields = fields.filter((f) => {
    const fObj = f.toObject ? f.toObject() : f;
    const fKey = fObj.fieldKey || fObj.field_key;
    return !excludes.includes(fKey);
  });

  return filteredFields.map((f) => {
    const fObj = f.toObject ? f.toObject() : f;
    const fKey = fObj.fieldKey || fObj.field_key;
    if (translations[fKey]) {
      return {
        ...fObj,
        label: translations[fKey]
      };
    }
    return fObj;
  });
};

exports.get = async (id) => {
  const doc = await fieldModel.findById(id);
  if (!doc) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

exports.create = async (payload, authedUser) => {
  const sId = payload?.screenId || payload?.screen_id;
  const fKey = payload?.fieldKey || payload?.field_key;
  if (!sId || !fKey || !payload?.label) {
    const err = new Error('screenId, fieldKey and label are required');
    err.status = 400;
    throw err;
  }
  const screen = await screenModel.findById(sId);
  if (!screen) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  let orgId = payload.organizationId || payload.organization_id;
  let wsId = payload.workspaceId || payload.workspace_id;
  let indId = payload.industryId || payload.industry_id;

  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const screenOrgId = screen.organizationId || screen.organization_id;
    if (!userOrgId || String(screenOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only create fields on screens belonging to your organization');
      err.status = 403;
      throw err;
    }
    orgId = userOrgId;
    wsId = authedUser?.workspaceId || authedUser?.workspace_id;
    indId = authedUser?.industryId || authedUser?.industry_id;
  } else if (orgId) {
    if (!wsId) wsId = 'ws_' + orgId;
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({
      $or: [{ organization_id: orgId }, { organizationId: orgId }]
    }).lean().exec();
    if (org) {
      indId = org.industryId || org.industry_id;
    }
  } else if (!indId) {
    indId = screen.industryId || screen.industry_id;
  }

  const dup = await fieldModel.findByScreenAndKey(sId, fKey);
  if (dup) {
    const err = new Error('Field with this key already exists for this screen');
    err.status = 409;
    throw err;
  }
  return fieldModel.create({
    ...payload,
    screenId: sId,
    fieldKey: fKey,
    organization_id: orgId || null,
    workspace_id: wsId || null,
    industry_id: indId || null
  });
};

exports.update = async (id, patch, authedUser) => {
  const current = await fieldModel.findById(id);
  if (!current) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const orgId = authedUser?.organizationId;
    const fieldOrgId = current.organizationId || current.organization_id;
    if (!orgId || String(fieldOrgId) !== String(orgId)) {
      const err = new Error('Forbidden: You can only edit fields belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  const fKey = patch?.fieldKey || patch?.field_key;
  if (fKey) {
    const dup = await fieldModel.findByScreenAndKey(current.screenId, fKey);
    if (dup && String(dup._id) !== String(id)) {
      const err = new Error('Field with this key already exists for this screen');
      err.status = 409;
      throw err;
    }
  }
  return fieldModel.update(id, patch || {});
};

// Cascade: removing a field also removes its permission rows.
exports.remove = async (id, authedUser) => {
  const doc = await fieldModel.findById(id);
  if (!doc) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const orgId = authedUser?.organizationId || authedUser?.organization_id;
    const fieldOrgId = doc.organizationId || doc.organization_id;
    if (!orgId || String(fieldOrgId) !== String(orgId)) {
      const err = new Error('Forbidden: You can only delete fields belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  await permissionModel.removeByField(id);
  await fieldModel.remove(id);
  return doc;
};
