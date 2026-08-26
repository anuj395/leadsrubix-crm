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

const { mapWithDualCase, withDualCase } = require('../utils/caseConverter');

exports.list = async (req, res, next) => {
  try {
    const items = await service.listForUser({
      authedUser: req.user,
      industryIdQuery: req.query.industryId,
      organizationIdQuery: req.query.organizationId,
      limit: Number(req.query.limit) || 200,
    });
    res.json({ items: mapWithDualCase(items) });
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

exports.retrieve = async (req, res, next) => {
  try {
    const contactModel = require('../models/contactModel');
    const item = await contactModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Contact not found' });
    res.json({ item: withDualCase(item) });
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

exports.convert = async (req, res, next) => {
  try {
    const result = await service.convertContact({
      contactId: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(result);
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

exports.deleteImportHistory = async (req, res, next) => {
  try {
    const result = await service.deleteImportLog({
      id: req.params.id,
      authedUser: req.user,
    });
    res.json(result);
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

    const requestedIndustry = req.body.industryId || req.query.industryId;
    const requestedOrganization = req.body.organizationId || req.query.organizationId;

    // --- Dynamic Column Resolution via Screen Permission Service ---
    const screenPermissionService = require('../services/screenPermissionService');
    const targetIndustryCode = requestedIndustry || req.user?.industry_id || req.user?.industryId || null;
    
    let columns = [{ header: 'Organization Name', key: 'organization_name', width: 25 }];
    
    try {
      const resolved = await screenPermissionService.resolve({
        screenKey: 'contacts',
        industryCode: targetIndustryCode,
        roleKey: req.user?.role || 'admin',
      });
      if (resolved && Array.isArray(resolved.table_headers)) {
        resolved.table_headers.forEach((h) => {
          if (h.key !== 'organization_id' && h.key !== 'organizationId') {
            columns.push({
              header: h.label,
              key: h.key,
              width: 25,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to resolve dynamic screen headers for export:', e);
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

    // --- Multi-Tenant Scope Filtering ---
    if (req.user?.role === 'superAdmin') {
      if (requestedOrganization && requestedOrganization !== 'all') {
        filter["$or"] = [
          { organization_id: requestedOrganization },
          { organizationId: requestedOrganization }
        ];
      } else if (requestedIndustry && requestedIndustry !== 'all') {
        const Organization = mongoose.model('Organization');
        const Industry = mongoose.model('Industry');
        let indDoc = null;
        if (mongoose.Types.ObjectId.isValid(requestedIndustry)) {
          indDoc = await Industry.findById(requestedIndustry).lean().exec();
        } else {
          indDoc = await Industry.findOne({ code: requestedIndustry }).lean().exec();
        }
        const indIdStr = indDoc ? String(indDoc._id) : requestedIndustry;
        const indCode = indDoc ? indDoc.code : requestedIndustry;
        const orgs = await Organization.find({
          $or: [
            { industryId: indIdStr },
            { industry_id: indIdStr },
            { industryId: indCode },
            { industry_id: indCode },
            { industryCode: indCode },
            { industry_code: indCode }
          ]
        }).lean().exec();
        const orgIds = orgs.map(o => o.organization_id || o.organizationId || String(o._id)).filter(Boolean);
        filter["$or"] = [
          { organization_id: { $in: orgIds } },
          { organizationId: { $in: orgIds } },
          { industry_id: indIdStr },
          { industryId: indIdStr },
          { industry_id: indCode },
          { industryId: indCode }
        ];
      }
    } else {
      if (req.user?.organizationId) {
        filter["$or"] = [{ organization_id: req.user.organizationId }, { organizationId: req.user.organizationId }];
      }
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

exports.addAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, base64Data, type, url } = req.body;
    const result = await service.addContactAttachment({
      contactId: id,
      name,
      base64Data,
      url,
      type: type || 'file',
      authedUser: req.user
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const result = await service.deleteContactAttachment({
      contactId: id,
      attachmentId,
      authedUser: req.user
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

