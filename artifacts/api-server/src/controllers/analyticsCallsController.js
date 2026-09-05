const analyticsLeadController = require('./analyticsLeadController');
const callLogsController = require('./callLogsController');

const QUERY_TIMEOUT_MS = 30000;

const cloneValue = (value) => JSON.parse(JSON.stringify(value ?? {}));

const createMockReqRes = (body, params = {}, user = null) => {
  const req = { body: cloneValue(body), params: { ...params }, user: user ? cloneValue(user) : null };
  let resolvePromise;

  const rawPromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const promise = Promise.race([
    rawPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Analytics sub-query timed out')), QUERY_TIMEOUT_MS)
    ),
  ]).catch((err) => {
    console.error('Analytics sub-query error:', err.message);
    return null;
  });

  const res = {
    status: function (code) {
      this._statusCode = code;
      return this;
    },
    send: function (data) {
      resolvePromise(data);
    },
    json: function (data) {
      resolvePromise(data);
    },
  };

  return { req, res, promise };
};

const dashboard = async (req, res) => {
  const type = req?.params?.type;
  console.log('Received calls analytics dashboard request with body:', req.body);
  try {
    const uid = req.body.uid || req.user?.uid || req.user?.id || req.user?._id;
    const { start_date, end_date, callFilter, leadFilter, taskFilter, leadUserFilter } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'Authentication required' });
    }

    const buildAnalyticsBody = () => ({
      uid,
      start_date,
      end_date,
      callFilter: cloneValue(callFilter),
      leadFilter: cloneValue(leadFilter),
      taskFilter: cloneValue(taskFilter),
      leadUserFilter: cloneValue(leadUserFilter),
    });

    const callingReq = createMockReqRes(
      buildAnalyticsBody(),
      { type },
      req.user
    );

    const interestedStageReq = createMockReqRes(
      { ...buildAnalyticsBody(), parameter: 'stageChangeAt' },
      { type },
      req.user
    );

    analyticsLeadController.InterestedReport(interestedStageReq.req, interestedStageReq.res);
    callLogsController.CallingReport(callingReq.req, callingReq.res);

    const [
      interestedStage,
      calls
    ] = await Promise.all([
      interestedStageReq.promise,
      callingReq.promise,
    ]);

    return res.status(200).json({
      success: true,
      interestedStage,
      calls,
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
};

module.exports = { dashboard };
