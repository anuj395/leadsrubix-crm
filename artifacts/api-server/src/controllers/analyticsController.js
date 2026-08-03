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
    const { industryId, organizationId } = req.query;
    const query = {};
    if (industryId) query.industry_id = industryId;
    if (organizationId) query.organization_id = organizationId;
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
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.createConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const doc = await AnalyticsConfig.create(req.body || {});
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const doc = await AnalyticsConfig.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).lean().exec();
    if (!doc) return res.status(404).json({ message: 'Config not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.deleteConfig = async (req, res, next) => {
  try {
    const AnalyticsConfig = mongoose.model('AnalyticsConfig');
    const doc = await AnalyticsConfig.findByIdAndDelete(req.params.id).exec();
    if (!doc) return res.status(404).json({ message: 'Config not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
