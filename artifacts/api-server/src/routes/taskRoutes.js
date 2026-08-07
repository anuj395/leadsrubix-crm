const { Task } = require('../models/taskModel');
const { authenticate } = require('../middlewares/auth');
const { buildController, buildRouter } = require('../services/crudFactory');

const controller = buildController({
  Model: Task,
  resourceName: 'Task',
  searchKeys: ['customerName', 'type', 'status'],
  allowedSort: ['createdAt', 'updatedAt', 'dueDate'],
});

const router = buildRouter(controller, { authenticate });

router.post('/uniqueTaskTypeUpdate', authenticate, async (req, res, next) => {
  try {
    const { id, unique_meeting, unique_site_visit } = req.body;
    if (!id) {
      return res.status(400).json({ message: 'Missing task id' });
    }
    const update = {};
    if (unique_meeting !== undefined) update.uniqueMeeting = !!unique_meeting;
    if (unique_site_visit !== undefined) update.uniqueSiteVisit = !!unique_site_visit;

    const query = { _id: id };
    if (req.user?.role !== 'superAdmin') {
      query.organization_id = req.user?.organizationId;
    }
    const updated = await Task.findOneAndUpdate(query, { $set: update }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
