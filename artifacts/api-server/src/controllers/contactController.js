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

