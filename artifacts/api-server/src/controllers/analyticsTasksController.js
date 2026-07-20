const taskController = require('./taskController');

const QUERY_TIMEOUT_MS = 30000;

const cloneValue = (value) => JSON.parse(JSON.stringify(value ?? {}));

const createMockReqRes = (body, params = {}) => {
  const req = { body: cloneValue(body), params: { ...params } };
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
  console.log('Received tasks analytics dashboard request with body:', req.body);
  try {
    const uid = req.body.uid;
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

    const tasksCompletedReq = createMockReqRes(
      { ...buildAnalyticsBody(), status: 'Completed', parameter: 'type' },
      { type }
    );

    const tasksOverdueReq = createMockReqRes(
      { ...buildAnalyticsBody(), status: 'Overdue', parameter: 'type' },
      { type }
    );

    const tasksPendingReq = createMockReqRes(
      { ...buildAnalyticsBody(), status: 'Pending', parameter: 'type' },
      { type }
    );

    taskController.TasksReport(tasksCompletedReq.req, tasksCompletedReq.res);
    taskController.TasksReport(tasksOverdueReq.req, tasksOverdueReq.res);
    taskController.TasksReport(tasksPendingReq.req, tasksPendingReq.res);

    const [
      tasksCompleted,
      tasksOverdue,
      tasksPending,
    ] = await Promise.all([
      tasksCompletedReq.promise,
      tasksOverdueReq.promise,
      tasksPendingReq.promise,
    ]);

    return res.status(200).json({
      success: true,
      tasks: {
        completed: tasksCompleted,
        overdue: tasksOverdue,
        pending: tasksPending,
      },
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
};

module.exports = { dashboard };
