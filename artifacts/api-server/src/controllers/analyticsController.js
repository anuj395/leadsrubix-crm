const service = require('../services/analyticsService');

exports.getAnalyticsDashboardData = async (req, res, next) => {
  try {
    const { group_by, industryId, start_date, end_date } = req.query;
    const authedUser = req.user;

    const data = await service.getAnalyticsDashboardData({
      authedUser,
      industryIdQuery: industryId,
      groupBy: group_by,
      startDate: start_date,
      endDate: end_date
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};
