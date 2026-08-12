const service = require('../services/analyticsService');

exports.getAnalyticsDashboardData = async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy || req.query.group_by;
    const startDate = req.query.startDate || req.query.start_date;
    const endDate = req.query.endDate || req.query.end_date;
    const { industryId, organizationId } = req.query;
    const authedUser = req.user;

    const data = await service.getAnalyticsDashboardData({
      authedUser,
      industryIdQuery: industryId,
      organizationIdQuery: organizationId,
      groupBy,
      startDate,
      endDate
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getDashboardConfig = async (req, res, next) => {
  try {
    const { industryId, organizationId } = req.query;
    const authedUser = req.user;

    const data = await service.getDashboardConfig({
      authedUser,
      industryIdQuery: industryId,
      organizationIdQuery: organizationId
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

const mongoose = require('mongoose');

exports.listConfigs = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const Industry = mongoose.model('Industry');
    const { industryId, organizationId } = req.query;
    const isSuperAdmin = req.user.role === 'superAdmin';

    let targetIndCode = industryId || req.user.industryId || req.user.industry_id || 'temp0001';
    let industryDoc = await Industry.findOne({ code: targetIndCode }).lean().exec();
    if (!industryDoc && mongoose.Types.ObjectId.isValid(targetIndCode)) {
      industryDoc = await Industry.findById(targetIndCode).lean().exec();
    }

    const industryIds = [targetIndCode];
    if (industryDoc) {
      industryIds.push(String(industryDoc._id));
      if (industryDoc.code) industryIds.push(industryDoc.code);
    }

    const query = { industry_id: { $in: industryIds } };

    if (isSuperAdmin) {
      if (organizationId && organizationId !== 'null' && organizationId !== 'undefined') {
        query.organization_id = organizationId;
      } else {
        query.organization_id = { $in: [null, undefined] };
      }
    } else {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      if (userOrgId) {
        query.$or = [{ organization_id: userOrgId }, { organization_id: { $in: [null, undefined] } }];
      } else {
        query.organization_id = { $in: [null, undefined] };
      }
    }

    let docs = await AnalyticsConfig.find(query).lean().exec();

    // Fallback to industry default template if organization override does not exist
    if (isSuperAdmin && organizationId && organizationId !== 'null' && organizationId !== 'undefined' && docs.length === 0) {
      const fallbackQuery = {
        industry_id: { $in: industryIds },
        organization_id: { $in: [null, undefined] }
      };
      docs = await AnalyticsConfig.find(fallbackQuery).lean().exec();
    }

    res.json({ items: docs });
  } catch (err) {
    next(err);
  }
};

exports.getConfigById = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const doc = await AnalyticsConfig.findById(req.params.id).lean().exec();
    if (!doc) return res.status(404).json({ message: 'Config not found' });

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const docOrgId = doc.organization_id || doc.organizationId;
      if (docOrgId && userOrgId && docOrgId !== userOrgId) {
        return res.status(403).json({ message: 'Forbidden: Access denied to other organization configuration' });
      }
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.createConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const Industry = mongoose.model('Industry');
    const payload = req.body || {};

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const userIndId = req.user.industryId || req.user.industry_id;
      const userWsId = req.user.workspaceId || req.user.workspace_id;
      payload.organization_id = userOrgId;
      payload.industry_id = userIndId;
      payload.workspace_id = userWsId;
    }

    if (payload.industry_id) {
      let ind = await Industry.findOne({ code: payload.industry_id }).lean().exec();
      if (!ind && mongoose.Types.ObjectId.isValid(payload.industry_id)) {
        ind = await Industry.findById(payload.industry_id).lean().exec();
      }
      if (ind) {
        payload.industry_id = String(ind._id);
      }
    }

    const doc = await AnalyticsConfig.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const existing = await AnalyticsConfig.findById(req.params.id).lean().exec();
    if (!existing) return res.status(404).json({ message: 'Config not found' });

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const userWsId = req.user.workspaceId || req.user.workspace_id;
      const docOrgId = existing.organization_id || existing.organizationId;
      if (docOrgId && userOrgId && docOrgId !== userOrgId) {
        return res.status(403).json({ message: 'Forbidden: Cannot update other organization configuration' });
      }
      if (req.body) {
        req.body.organization_id = userOrgId;
        req.body.workspace_id = userWsId;
        delete req.body.organizationId;
        delete req.body.workspaceId;
      }
    }

    if (req.body && req.body.industry_id) {
      const Industry = mongoose.model('Industry');
      let ind = await Industry.findOne({ code: req.body.industry_id }).lean().exec();
      if (!ind && mongoose.Types.ObjectId.isValid(req.body.industry_id)) {
        ind = await Industry.findById(req.body.industry_id).lean().exec();
      }
      if (ind) {
        req.body.industry_id = String(ind._id);
      }
    }

    const doc = await AnalyticsConfig.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).lean().exec();
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.deleteConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const existing = await AnalyticsConfig.findById(req.params.id).lean().exec();
    if (!existing) return res.status(404).json({ message: 'Config not found' });

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const docOrgId = existing.organization_id || existing.organizationId;
      if (docOrgId && userOrgId && docOrgId !== userOrgId) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete other organization configuration' });
      }
    }

    await AnalyticsConfig.findByIdAndDelete(req.params.id).exec();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
