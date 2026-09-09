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

  const BOOKINGS_TRANSLATIONS = {
    temp0001: {
      customerName: 'Buyer / Customer Name',
      contactNumber: 'Phone Number',
      project: 'Property Project',
      location: 'Project Location',
      unitNumber: 'Unit / Flat Number',
      bookingAmount: 'Booking Token Amount (₹)',
      bookingDate: 'Booking Date',
      status: 'Booking Status',
      branch: 'Branch Office',
      team: 'Sales Team',
      notes: 'Booking Remarks & Unit Notes',
    },
    temp0002: {
      customerName: 'Customer Name',
      contactNumber: 'Contact Number',
      project: 'Product Catalog / Store',
      location: 'Delivery / Fulfillment Hub',
      unitNumber: 'Order / SKU Reference',
      bookingAmount: 'Paid Order Amount (₹)',
      bookingDate: 'Order Date',
      status: 'Order Status',
      branch: 'Store / Regional Hub',
      team: 'Fulfillment Team',
      notes: 'Order Notes & Instructions',
    },
    temp0003: {
      customerName: 'Patient Name',
      contactNumber: 'Patient Contact Number',
      project: 'Clinical Department / Specialty',
      location: 'Clinic / Hospital Center',
      unitNumber: 'Room / OPD Slot Number',
      bookingAmount: 'Consultation / Procedure Fee (₹)',
      bookingDate: 'Appointment / Admission Date',
      status: 'Appointment Status',
      branch: 'Hospital Wing / Branch',
      team: 'Care Team',
      notes: 'Clinical Notes / Doctor Instructions',
    },
    temp0004: {
      customerName: 'Student / Applicant Name',
      contactNumber: 'Student Phone Number',
      project: 'Academic Program / Course',
      location: 'Campus / Center',
      unitNumber: 'Roll / Batch Number',
      bookingAmount: 'Admission / Seat Fee (₹)',
      bookingDate: 'Enrollment Date',
      status: 'Enrollment Status',
      branch: 'Campus / Center',
      team: 'Admissions Team',
      notes: 'Admission Remarks / Electives',
    },
    temp0005: {
      customerName: 'Client / Investor Name',
      contactNumber: 'Client Phone Number',
      project: 'Financial Product / Scheme',
      location: 'Branch Office',
      unitNumber: 'Folio / Account Reference',
      bookingAmount: 'Disbursal / Investment Amount (₹)',
      bookingDate: 'Disbursal / Mandate Date',
      status: 'Disbursal Status',
      branch: 'Wealth Management Branch',
      team: 'Advisory Team',
      notes: 'Mandate Terms & Advisory Remarks',
    },
    temp0006: {
      customerName: 'Client / Account Name',
      contactNumber: 'Client Point of Contact',
      project: 'Service SOW / Solution',
      location: 'Delivery Center',
      unitNumber: 'SOW / Contract ID',
      bookingAmount: 'Milestone / SOW Advance (₹)',
      bookingDate: 'Contract Signing Date',
      status: 'Engagement Status',
      branch: 'Delivery Unit',
      team: 'Practice / Delivery Team',
      notes: 'Scope & Milestone Deliverables',
    },
    temp0007: {
      customerName: 'Distributor / Dealer Name',
      contactNumber: 'Dealer Contact Number',
      project: 'Product Line / Batch Spec',
      location: 'Dispatch Plant / Warehouse',
      unitNumber: 'Batch / Lot Number',
      bookingAmount: 'PO Advance Amount (₹)',
      bookingDate: 'PO / Dispatch Date',
      status: 'Batch Status',
      branch: 'Manufacturing Unit',
      team: 'Dispatch & Logistics Team',
      notes: 'PO Terms & Packaging Specs',
    },
  };

  const Screen = mongoose.model('Screen');
  const screen = await Screen.findById(opts.screenId).lean().exec();
  const screenKey = screen?.key;

  const translations = (screenKey === 'configProjects' && PROJECT_TRANSLATIONS[indCode]) || 
                       (screenKey === 'users' && USER_TRANSLATIONS[indCode]) || 
                       (screenKey === 'leadDistribution' && DISTRIBUTION_TRANSLATIONS[indCode]) ||
                       (screenKey === 'leadRotation' && ROTATION_TRANSLATIONS[indCode]) || 
                       (screenKey === 'contacts' && CONTACTS_TRANSLATIONS[indCode]) || 
                       (screenKey === 'deals' && DEALS_TRANSLATIONS[indCode]) || 
                       (screenKey === 'bookings' && BOOKINGS_TRANSLATIONS[indCode]) || {};

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
