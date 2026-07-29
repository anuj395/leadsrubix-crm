const { Task } = require('../models/taskModel');
const { authenticate } = require('../middlewares/auth');
const { buildController, buildRouter } = require('../services/crudFactory');

const controller = buildController({
  Model: Task,
  resourceName: 'Task',
  searchKeys: ['customerName', 'type', 'status'],
  allowedSort: ['createdAt', 'updatedAt', 'dueDate'],
});

const taskController = require('../controllers/taskController');
const router = buildRouter(controller, { authenticate });

router.post('/masterSearch', authenticate, taskController.MasterSearch);
router.post('/maskMasterSearch', authenticate, taskController.MaskMasterSearch);
router.post('/masterFilterValues', authenticate, taskController.MasterFilterValues);
router.post('/masterContactCount', authenticate, taskController.MasterContactCount);

router.post('/uniqueTaskTypeUpdate', authenticate, async (req, res, next) => {
  try {
    const { id, unique_meeting, unique_site_visit } = req.body;
    if (!id) {
      return res.status(400).json({ message: 'Missing task id' });
    }
    const update = {};
    if (unique_meeting !== undefined) update.uniqueMeeting = !!unique_meeting;
    if (unique_site_visit !== undefined) update.uniqueSiteVisit = !!unique_site_visit;

    const updated = await Task.findByIdAndUpdate(id, { $set: update }, { new: true });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
