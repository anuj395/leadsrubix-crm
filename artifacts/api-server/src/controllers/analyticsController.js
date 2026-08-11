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
      if (organizationId) query.organization_id = organizationId;
    } else {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      if (userOrgId) {
        query.$or = [{ organization_id: userOrgId }, { organization_id: null }];
      }
    }

    const docs = await AnalyticsConfig.find(query).lean().exec();
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
    const payload = req.body || {};

    if (req.user.role !== 'superAdmin') {
      const userOrgId = req.user.organizationId || req.user.organization_id;
      const userIndId = req.user.industryId || req.user.industry_id;
      const userWsId = req.user.workspaceId || req.user.workspace_id;
      payload.organization_id = userOrgId;
      payload.industry_id = userIndId;
      payload.workspace_id = userWsId;
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
