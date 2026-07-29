const service = require('../services/contactService');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { convertKeysToCamelCase } = require('../services/crudFactory');

// Helper to get organization name
const getOrganizationName = async (orgId) => {
  try {
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ organization_id: orgId }).lean().exec();
    return org ? (org.organization_name || org.name) : "Unknown Organization";
  } catch (error) {
    console.error("Error fetching organization name:", error);
    return "Unknown Organization";
  }
};

const datesField = ["created_at", "updated_at", "next_follow_up_date_time", "dueDate", "nextFollowUp"];
const booleanField = ['associateStatus', 'sourceStatus', 'transferStatus', 'transfer_status'];

function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return '*'.repeat(clean.length - 4) + clean.slice(-4);
}

function maskEmail(email) {
  if (!email) return '';
  const parts = String(email).split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return '*'.repeat(name.length) + '@' + domain;
  return name.slice(0, 2) + '*'.repeat(name.length - 2) + '@' + domain;
}

exports.list = async (req, res, next) => {
  try {
    const items = await service.listForUser({
      authedUser: req.user,
      limit: Number(req.query.limit) || 200,
    });
    res.json({ items: convertKeysToCamelCase(items) });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await service.createForUser({
      payload: req.body,
      authedUser: req.user,
    });
    res.status(201).json(convertKeysToCamelCase(item));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await service.updateForUser({
      id: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(convertKeysToCamelCase(item));
  } catch (err) {
    next(err);
  }
};

exports.transfer = async (req, res, next) => {
  try {
    const { ids, owner, reason, leadType, options } = req.body;
    const result = await service.transferLeads({
      ids,
      owner,
      reason,
      leadType,
      options,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.bulkReassign = async (req, res, next) => {
  try {
    const { ids, contactOwnerEmail, uid } = req.body;
    const result = await service.bulkReassignContacts({
      ids,
      contactOwnerEmail,
      uid,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.bulkImport = async (req, res, next) => {
  try {
    const { contacts } = req.body;
    const result = await service.bulkImportContacts({
      contacts,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.importHistory = async (req, res, next) => {
  try {
    const logs = await service.listImportLogs({
      authedUser: req.user,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.deleteForUser({
      id: req.params.id,
      authedUser: req.user,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.masterSortSearch = async (req, res, next) => {
  try {
    const Contact = mongoose.model('Contact');
    const Screen = mongoose.model('Screen');
    const ScreenField = mongoose.model('ScreenField');

    const sort = req.body.sort || {};
    const missed = req.body.missed;
    const searchString = req.body.searchString || "";
    let filter = req.body.filter || {};

    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const dateField = req.body.dateField || "created_at"; // default field

    // 1. Resolve Columns Dynamically
    const columns = [];
    columns.push({
      header: 'Organization Name',
      key: 'organization_name',
      width: 25,
    });

    const screenDoc = await Screen.findOne({ key: 'contacts' }).exec();
    if (screenDoc) {
      const fields = await ScreenField.find({ screen_id: screenDoc._id, is_active: true })
        .sort({ order: 1, label: 1 })
        .exec();

      fields.forEach((f) => {
        const key = f.field_key || f.fieldKey;
        if (key !== 'organization_id' && key !== 'organizationId') {
          columns.push({
            header: f.label,
            key: key,
            width: 25,
          });
        }
      });
    }

    // --- Handle date & boolean filters ---
    Object.keys(filter).forEach((key) => {
      if (datesField.includes(key)) {
        if (filter[key].length && filter[key].length === 2) {
          filter[key] = {
            $gte: new Date(filter[key][0]),
            $lte: new Date(filter[key][1]),
          };
        }
      } else if (booleanField.includes(key)) {
        filter[key] = filter[key].map((v) =>
          v === "True" || v === true ? true : false
        );
      } else {
        filter[key] = { $in: filter[key] };
      }
    });

    // --- Add start & end date filter ---
    if (startDate || endDate) {
      filter[dateField] = {};
      if (startDate) filter[dateField].$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter[dateField].$lte = end;
      }
    }

    // --- Missed follow-ups ---
    if (missed === true) {
      filter["next_follow_up_date_time"] = { $lt: new Date() };
    }

    // --- Build name/contact search ---
    let customer_name_list = [];
    let contact_list = [];

    if (searchString) {
      searchString.split(",").forEach((string) => {
        const search = string.trim();
        const re = new RegExp(search, "i");
        if (search.match(/^[0-9]+$/) != null) {
          contact_list.push(re);
        } else if (search !== "") {
          customer_name_list.push(re);
        }
      });
    }

    if (contact_list.length !== 0) {
      filter["$or"] = [
        { contact_no: { $in: contact_list } },
        { alternate_no: { $in: contact_list } },
      ];
    }

    if (customer_name_list.length !== 0) {
      filter["customer_name"] = { $in: customer_name_list };
    }

    // --- Exclude unwanted stages if not filtered ---
    if (!filter?.stage) {
      filter["stage"] = { $nin: ["LOST", "NOT INTERESTED"] };
    }

    // SuperAdmin gets all, but Admin/others should filter by organizationId
    if (req.user?.role !== 'superAdmin') {
      filter["organization_id"] = req.user?.organizationId;
    }

    // --- Fetch all sorted data ---
    const leads = await Contact.find(filter).sort(sort);

    // enrich with organization_name so export shows org name
    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const orgId = lead.organization_id || lead.organizationId;
        const orgName = await getOrganizationName(orgId);
        // Map any virtual/alias fields
        const leadObj = lead.toObject?.() || lead;
        
        const rowData = {
          ...leadObj,
          organization_name: orgName,
        };

        // Align dynamic property values to match column keys (supports case differences)
        columns.forEach((col) => {
          if (col.key === 'organization_name') return;
          const val = leadObj[col.key];
          if (val !== undefined) {
            rowData[col.key] = val;
          } else {
            // Check camelCase alias format
            const camelKey = col.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            if (leadObj[camelKey] !== undefined) {
              rowData[col.key] = leadObj[camelKey];
            } else {
              // Check snake_case key format
              const snakeKey = col.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
              if (leadObj[snakeKey] !== undefined) {
                rowData[col.key] = leadObj[snakeKey];
              }
            }
          }
        });

        return rowData;
      })
    );

    // --- Create Excel workbook ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Leads");

    // Add headers dynamically
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    if (enrichedLeads.length > 0) {
      enrichedLeads.forEach((lead) => {
        const rowData = {};
        columns.forEach((col) => {
          rowData[col.key] = lead[col.key] || "";
        });
        worksheet.addRow(rowData);
      });
    } else {
      worksheet.addRow(["No data found for the given filters"]);
    }

    // --- Set response headers for file download ---
    const fileName = `leads_export_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // --- Send the Excel file ---
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error in masterSortSearch Excel export:", error);
    next(error);
  }
};

const buildQuery = async (req) => {
  let filter = req.body.filter || {};
  const missed = req.body.missed;
  const searchString = req.body.searchString || "";
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const dateField = req.body.dateField || "created_at";

  const resolvedFilter = {};

  if (filter.organization_name) {
    const Organization = mongoose.model('Organization');
    const orgDocs = await Organization.find(
      { organization_name: { $in: filter.organization_name } },
      { organization_id: 1, _id: 0 }
    );
    const orgIds = orgDocs.map((o) => o.organization_id.toString());
    resolvedFilter.organization_id = { $in: orgIds };
  }

  Object.keys(filter).forEach((key) => {
    if (key === 'organization_name') return;

    if (datesField.includes(key)) {
      if (filter[key].length && filter[key].length === 2) {
        resolvedFilter[key] = {
          $gte: new Date(filter[key][0]),
          $lte: new Date(filter[key][1]),
        };
      }
    } else if (booleanField.includes(key)) {
      resolvedFilter[key] = filter[key].map((v) =>
        v === "True" || v === true ? true : false
      );
    } else {
      resolvedFilter[key] = { $in: filter[key] };
    }
  });

  if (startDate || endDate) {
    resolvedFilter[dateField] = {};
    if (startDate) resolvedFilter[dateField].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      resolvedFilter[dateField].$lte = end;
    }
  }

  if (missed === true) {
    resolvedFilter["next_follow_up_date_time"] = { $lt: new Date() };
  }

  let customer_name_list = [];
  let contact_list = [];

  if (searchString) {
    searchString.split(",").forEach((string) => {
      const search = string.trim();
      const re = new RegExp(search, "i");
      if (search.match(/^[0-9]+$/) != null) {
        contact_list.push(re);
      } else if (search !== "") {
        customer_name_list.push(re);
      }
    });
  }

  if (contact_list.length !== 0) {
    resolvedFilter["$or"] = [
      { contact_no: { $in: contact_list } },
      { alternate_no: { $in: contact_list } },
    ];
  }

  if (customer_name_list.length !== 0) {
    resolvedFilter["customer_name"] = { $in: customer_name_list };
  }

  if (!resolvedFilter.stage) {
    resolvedFilter["stage"] = { $nin: ["LOST", "NOT INTERESTED"] };
  }

  if (req.user?.role !== 'superAdmin') {
    resolvedFilter["organization_id"] = req.user?.organizationId;
  }

  return resolvedFilter;
};

exports.masterSearch = async (req, res, next) => {
  try {
    const Contact = mongoose.model('Contact');
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;
    const sort = req.body.sort || {};

    const query = await buildQuery(req);
    const leads = await Contact.find(query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const orgId = lead.organization_id || lead.organizationId;
        const orgName = await getOrganizationName(orgId);
        return {
          ...(lead.toObject?.() || lead),
          organization_name: orgName,
        };
      })
    );

    res.json(convertKeysToCamelCase(enrichedLeads));
  } catch (err) {
    next(err);
  }
};

exports.maskMasterSearch = async (req, res, next) => {
  try {
    const Contact = mongoose.model('Contact');
    const page = Number(req.body.page) || 1;
    const pageSize = Number(req.body.pageSize) || 50;
    const sort = req.body.sort || {};

    const query = await buildQuery(req);
    const leads = await Contact.find(query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const orgId = lead.organization_id || lead.organizationId;
        const orgName = await getOrganizationName(orgId);
        const leadObj = lead.toObject?.() || lead;
        
        if (leadObj.contact_no) leadObj.contact_no = maskPhone(leadObj.contact_no);
        if (leadObj.contactNumber) leadObj.contactNumber = maskPhone(leadObj.contactNumber);
        if (leadObj.alternate_no) leadObj.alternate_no = maskPhone(leadObj.alternate_no);
        if (leadObj.alternateNo) leadObj.alternateNo = maskPhone(leadObj.alternateNo);
        if (leadObj.email) leadObj.email = maskEmail(leadObj.email);
        if (leadObj.emailId) leadObj.emailId = maskEmail(leadObj.emailId);

        return {
          ...leadObj,
          organization_name: orgName,
        };
      })
    );

    res.json(convertKeysToCamelCase(enrichedLeads));
  } catch (err) {
    next(err);
  }
};

exports.maskMasterSortSearch = async (req, res, next) => {
  try {
    const Contact = mongoose.model('Contact');
    const Screen = mongoose.model('Screen');
    const ScreenField = mongoose.model('ScreenField');

    const sort = req.body.sort || {};
    const missed = req.body.missed;
    const searchString = req.body.searchString || "";
    let filter = req.body.filter || {};

    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const dateField = req.body.dateField || "created_at";

    const columns = [];
    columns.push({
      header: 'Organization Name',
      key: 'organization_name',
      width: 25,
    });

    const screenDoc = await Screen.findOne({ key: 'contacts' }).exec();
    if (screenDoc) {
      const fields = await ScreenField.find({ screen_id: screenDoc._id, is_active: true })
        .sort({ order: 1, label: 1 })
        .exec();

      fields.forEach((f) => {
        const key = f.field_key || f.fieldKey;
        if (key !== 'organization_id' && key !== 'organizationId') {
          columns.push({
            header: f.label,
            key: key,
            width: 25,
          });
        }
      });
    }

    Object.keys(filter).forEach((key) => {
      if (datesField.includes(key)) {
        if (filter[key].length && filter[key].length === 2) {
          filter[key] = {
            $gte: new Date(filter[key][0]),
            $lte: new Date(filter[key][1]),
          };
        }
      } else if (booleanField.includes(key)) {
        filter[key] = filter[key].map((v) =>
          v === "True" || v === true ? true : false
        );
      } else {
        filter[key] = { $in: filter[key] };
      }
    });

    if (startDate || endDate) {
      filter[dateField] = {};
      if (startDate) filter[dateField].$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter[dateField].$lte = end;
      }
    }

    if (missed === true) {
      filter["next_follow_up_date_time"] = { $lt: new Date() };
    }

    let customer_name_list = [];
    let contact_list = [];

    if (searchString) {
      searchString.split(",").forEach((string) => {
        const search = string.trim();
        const re = new RegExp(search, "i");
        if (search.match(/^[0-9]+$/) != null) {
          contact_list.push(re);
        } else if (search !== "") {
          customer_name_list.push(re);
        }
      });
    }

    if (contact_list.length !== 0) {
      filter["$or"] = [
        { contact_no: { $in: contact_list } },
        { alternate_no: { $in: contact_list } },
      ];
    }

    if (customer_name_list.length !== 0) {
      filter["customer_name"] = { $in: customer_name_list };
    }

    if (!filter?.stage) {
      filter["stage"] = { $nin: ["LOST", "NOT INTERESTED"] };
    }

    if (req.user?.role !== 'superAdmin') {
      filter["organization_id"] = req.user?.organizationId;
    }

    const leads = await Contact.find(filter).sort(sort);

    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const orgId = lead.organization_id || lead.organizationId;
        const orgName = await getOrganizationName(orgId);
        const leadObj = lead.toObject?.() || lead;
        
        if (leadObj.contact_no) leadObj.contact_no = maskPhone(leadObj.contact_no);
        if (leadObj.contactNumber) leadObj.contactNumber = maskPhone(leadObj.contactNumber);
        if (leadObj.alternate_no) leadObj.alternate_no = maskPhone(leadObj.alternate_no);
        if (leadObj.alternateNo) leadObj.alternateNo = maskPhone(leadObj.alternateNo);
        if (leadObj.email) leadObj.email = maskEmail(leadObj.email);
        if (leadObj.emailId) leadObj.emailId = maskEmail(leadObj.emailId);

        const rowData = {
          ...leadObj,
          organization_name: orgName,
        };

        columns.forEach((col) => {
          if (col.key === 'organization_name') return;
          const val = leadObj[col.key];
          if (val !== undefined) {
            rowData[col.key] = val;
          } else {
            const camelKey = col.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            if (leadObj[camelKey] !== undefined) {
              rowData[col.key] = leadObj[camelKey];
            } else {
              const snakeKey = col.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
              if (leadObj[snakeKey] !== undefined) {
                rowData[col.key] = leadObj[snakeKey];
              }
            }
          }
        });

        return rowData;
      })
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Leads");

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    if (enrichedLeads.length > 0) {
      enrichedLeads.forEach((lead) => {
        const rowData = {};
        columns.forEach((col) => {
          rowData[col.key] = lead[col.key] || "";
        });
        worksheet.addRow(rowData);
      });
    } else {
      worksheet.addRow(["No data found for the given filters"]);
    }

    const fileName = `leads_export_masked_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error in maskMasterSortSearch Excel export:", error);
    next(error);
  }
};

exports.masterContactCount = async (req, res, next) => {
  try {
    const Contact = mongoose.model('Contact');
    const query = await buildQuery(req);
    const total = await Contact.countDocuments(query);
    res.json({ total });
  } catch (err) {
    next(err);
  }
};

exports.masterFilterValues = async (req, res, next) => {
  try {
    const Contact = mongoose.model('Contact');
    const Organization = mongoose.model('Organization');
    const query = await buildQuery(req);
    
    const budget = await Contact.distinct('budget', query);
    const source = await Contact.distinct('source', query);
    const location = await Contact.distinct('location', query);
    const stage = await Contact.distinct('stage', query);
    const projectName = await Contact.distinct('projectName', query);
    const propertyType = await Contact.distinct('propertyType', query);
    const leadType = await Contact.distinct('leadType', query);
    const contactOwnerEmail = await Contact.distinct('contactOwnerEmail', query);

    const organizationIds = await Contact.distinct('organization_id', query);
    const orgDocs = await Organization.find({ organization_id: { $in: organizationIds } }).lean().exec();
    const organizationNames = orgDocs.map(o => o.organization_name || o.name).filter(Boolean);

    res.json([{
      budget: budget.filter(Boolean).sort(),
      source: source.filter(Boolean).sort(),
      location: location.filter(Boolean).sort(),
      stage: stage.filter(Boolean).sort(),
      projectName: projectName.filter(Boolean).sort(),
      propertyType: propertyType.filter(Boolean).sort(),
      leadType: leadType.filter(Boolean).sort(),
      contactOwnerEmail: contactOwnerEmail.filter(Boolean).sort(),
      organizationName: organizationNames.sort(),
    }]);
  } catch (err) {
    next(err);
  }
};

