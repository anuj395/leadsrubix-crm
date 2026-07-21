const service = require('../services/analyticsService');

exports.getAnalyticsDashboardData = async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy || req.query.group_by;
    const startDate = req.query.startDate || req.query.start_date;
    const endDate = req.query.endDate || req.query.end_date;
    const { industryId } = req.query;
    const authedUser = req.user;

    const data = await service.getAnalyticsDashboardData({
      authedUser,
      industryIdQuery: industryId,
      groupBy,
      startDate,
      endDate
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};
