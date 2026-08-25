const dealModel = require('../models/dealModel');
const pipelineModel = require('../models/pipelineModel');
const mongoose = require('mongoose');

exports.listPipelines = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'superAdmin';
    const orgId = req.query.organizationId || req.headers['x-organization-id'] || req.user.organization_id || req.user.organizationId;
    const wsId = req.user.workspace_id || req.user.workspaceId || null;
    const indId = req.query.industryId || req.user.industry_id || req.user.industryId || req.headers['x-industry-id'] || null;

    const filter = {};
    if (orgId && orgId !== 'all') {
      filter.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    } else if (!isSuperAdmin) {
      filter.organization_id = 'default';
    }

    let pipelines = await pipelineModel.list({ filter });

    if (!pipelines || pipelines.length === 0) {
      const defaultStages = pipelineModel.getDefaultStagesForIndustry(indId);
      const defaultPipeline = await pipelineModel.Pipeline.create({
        name: 'Standard Pipeline',
        organization_id: (orgId && orgId !== 'all') ? orgId : null,
        workspace_id: wsId,
        industry_id: indId,
        is_default: true,
        stages: defaultStages,
        created_by: req.user._id || req.user.id
      });
      pipelines = [defaultPipeline.toObject()];
    }

    res.json({ items: pipelines });
  } catch (err) {
    next(err);
  }
};

exports.createPipeline = async (req, res, next) => {
  try {
    const orgId = req.body.organizationId || req.query.organizationId || req.user.organization_id || req.user.organizationId;
    const wsId = req.user.workspace_id || req.user.workspaceId || null;
    const indId = req.body.industryId || req.user.industry_id || req.user.industryId || req.headers['x-industry-id'] || null;

    const pipeline = await pipelineModel.Pipeline.create({
      ...req.body,
      organization_id: orgId,
      workspace_id: wsId,
      industry_id: indId,
      created_by: req.user._id || req.user.id
    });
    res.status(201).json(pipeline.toObject());
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'superAdmin';
    const orgId = req.query.organizationId || req.headers['x-organization-id'] || req.user.organization_id || req.user.organizationId;
    const filter = {};

    if (orgId && orgId !== 'all') {
      filter.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    } else if (!isSuperAdmin) {
      filter.organization_id = 'non_existent_scope';
    }

    if (req.query.pipelineId) {
      filter.pipeline_id = req.query.pipelineId;
    }
    if (req.query.contactId || req.query.contact_id) {
      const cId = String(req.query.contactId || req.query.contact_id);
      filter.contact_id = cId;
    }
    if (req.query.accountId || req.query.account_id) {
      const aId = String(req.query.accountId || req.query.account_id);
      filter.account_id = aId;
    }
    const andClauses = [];

    if (req.query.stage) {
      andClauses.push({
        $or: [{ stage: req.query.stage }, { stage_id: req.query.stage }]
      });
    }
    if (req.query.industryId) {
      filter.industry_id = req.query.industryId;
    }

    // Role-based visibility: if sales, filter to deals assigned to user unless view all allowed
    if (req.user.role === 'sales') {
      andClauses.push({
        $or: [
          { owner_id: req.user._id || req.user.id },
          { owner_email: req.user.email },
          { created_by: req.user._id || req.user.id }
        ]
      });
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    const items = await dealModel.list({ filter, limit: 1000 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const orgId = req.body.organizationId || req.query.organizationId || req.user.organization_id || req.user.organizationId || 'default';
    const wsId = req.user.workspace_id || req.user.workspaceId || null;
    const indId = req.body.industryId || req.user.industry_id || req.user.industryId || req.headers['x-industry-id'] || null;

    const cId = req.body.contactId || req.body.contact_id;
    const payload = {
      ...req.body,
      organization_id: orgId,
      organizationId: orgId,
      workspace_id: wsId,
      workspaceId: wsId,
      industry_id: indId,
      industryId: indId,
      contact_id: cId || null,
      contactId: cId || null,
      created_by: req.user._id || req.user.id,
      owner_name: req.body.ownerName || req.user.name || req.user.email,
      owner_email: req.body.ownerEmail || req.user.email
    };

    if (cId) {
      try {
        const Contact = mongoose.model('Contact');
        const contactDoc = await Contact.findById(cId).lean().exec();
        if (contactDoc) {
          payload.contact_name = payload.contact_name || contactDoc.customer_name || contactDoc.customerName || '';
          payload.contact_phone = payload.contact_phone || contactDoc.contact_number || contactDoc.contactNumber || '';
          payload.contact_email = payload.contact_email || contactDoc.email_id || contactDoc.emailId || '';
          payload.contactName = payload.contact_name;
          payload.contactPhone = payload.contact_phone;
          payload.contactEmail = payload.contact_email;
        }
      } catch (e) {
        // non-fatal
      }
    }

    if (!payload.pipeline_id && !payload.pipelineId) {
      try {
        const Pipeline = mongoose.model('Pipeline');
        const defaultPipe = await Pipeline.findOne({
          $or: [{ organization_id: orgId }, { organizationId: orgId }, { is_default: true }]
        }).lean().exec();
        if (defaultPipe) {
          payload.pipeline_id = defaultPipe._id || defaultPipe.id;
          payload.pipelineId = defaultPipe._id || defaultPipe.id;
        }
      } catch (e) {
        // non-fatal
      }
    }

    const item = await dealModel.create(payload);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await dealModel.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.updateStage = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { stage, stageId, probability, lostReason } = req.body;
    
    const finalStage = stage || stageId;
    const finalStageId = stageId || stage;

    const updateObj = {
      stage: finalStage,
      stage_id: finalStageId,
      stageId: finalStageId
    };
    if (typeof probability === 'number') updateObj.probability = probability;
    if (lostReason) {
      updateObj.lost_reason = lostReason;
      updateObj.lostReason = lostReason;
    }

    const updated = await dealModel.findByIdAndUpdate(id, { $set: updateObj }, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await dealModel.remove(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.retrieve = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await dealModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Deal not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};
