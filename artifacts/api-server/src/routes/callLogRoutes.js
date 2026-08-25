const express = require('express');
const router = express.Router();
const callLogsController = require('../controllers/callLogsController');
const { authenticate } = require('../middlewares/auth');

const {
  Create,
  Update,
  Search,
  FilterValues,
  CallLogCount,
  CallingReport,
  DeleteCallLogs,
  MasterSearch,
  MasterContactCount,
  MasterFilterValues,
  MaskMasterSearch
} = callLogsController;

const { requireScreenAction } = require('../middlewares/screenAction');

// Apply authenticate middleware to all endpoints
router.use(authenticate);

router.post('/create', requireScreenAction('callback', 'add'), Create);
router.post('/update', requireScreenAction('callback', 'edit'), Update);
router.post('/search', requireScreenAction('callback', 'view'), Search);
router.post('/masterSearch', requireScreenAction('callback', 'view'), MasterSearch);
router.post('/maskMasterSearch', requireScreenAction('callback', 'view'), MaskMasterSearch);
router.post('/filterValues', requireScreenAction('callback', 'view'), FilterValues);
router.post('/masterFilterValues', requireScreenAction('callback', 'view'), MasterFilterValues);
router.post('/callLogCount', requireScreenAction('callback', 'view'), CallLogCount);
router.post('/masterContactCount', requireScreenAction('callback', 'view'), MasterContactCount);
router.post('/callingReport', requireScreenAction('callback', 'view'), CallingReport);
router.delete('/deleteCallLogs', requireScreenAction('callback', 'delete'), DeleteCallLogs);

module.exports = router;
